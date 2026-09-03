/**
 * El papel que ya corrió.
 *
 * El tablero es un registrador de faja, así que la historia no es una consulta:
 * es la superficie. Este módulo produce ese registro y lo hace DETERMINISTA a
 * propósito — el servidor y el cliente tienen que escribir exactamente la misma
 * traza o React reporta desajuste de hidratación, y una traza que salta en el
 * primer render es un instrumento roto.
 *
 * El valor de AHORA no vive acá: sale del único `ProveedorVivo` del mundo. Este
 * archivo sólo dice de dónde viene ese valor y dónde se cortó el papel.
 *
 * DATOS SINTÉTICOS. Los nombres de buque son obras reales de Tecvol; las
 * lecturas y los umbrales son de demostración y la interfaz lo declara.
 */

import { LECTURAS, type BuqueDemo } from './datos';

/** Un paso de papel. 144 pasos de 10 min = 24 h de registro. */
export const PASO_MIN = 10;
export const MUESTRAS = 145;
export const VENTANA_MIN = (MUESTRAS - 1) * PASO_MIN;

export type Canal = {
  /** id en LECTURAS: el canal lee la misma magnitud que el instrumento. */
  id: string;
  designacion: string;
  etiqueta: string;
  unidad: string;
  decimales: number;
  /** Extremos de la escala impresa en el papel. */
  min: number;
  max: number;
  /** Línea de límite rayada en el papel. Cruzarla es la alarma. */
  limite?: { valor: number; rotulo: string };
};

/**
 * Los cuatro canales que llevan pluma. Designaciones y extremos de escala
 * heredados del frente que ya existe: −P1 tensión, −P2 corriente L1,
 * −P3 temperatura de bobinado, −P7 factor de potencia. El esquema de
 * numeración es uno solo para todo el sistema, no uno por pantalla.
 */
export const CANALES: Canal[] = [
  {
    id: 'u12',
    designacion: '−P1',
    etiqueta: 'Tensión de barra',
    unidad: 'V',
    decimales: 0,
    min: 340,
    max: 420,
  },
  {
    id: 'i1',
    designacion: '−P2',
    etiqueta: 'Corriente L1',
    unidad: 'A',
    decimales: 0,
    min: 0,
    max: 400,
    limite: { valor: 280, rotulo: 'Máx 280 A' },
  },
  {
    /* La escala del canal es más angosta que la del medidor del frente: un
       registrador se expande sobre la banda de trabajo, que es donde tres
       grados de más tienen que poder verse. */
    id: 'tb',
    designacion: '−P3',
    etiqueta: 'Temp. bobinado G1',
    unidad: '°C',
    decimales: 0,
    min: 30,
    max: 90,
    limite: { valor: 75, rotulo: 'Máx 75 °C' },
  },
  {
    id: 'cos',
    designacion: '−P7',
    etiqueta: 'Factor de potencia',
    unidad: '',
    decimales: 2,
    min: 0.6,
    max: 1,
  },
];

/** Lo que no lleva pluma pero igual se reporta: se monta como lectura digital. */
export const AUXILIARES = [
  { id: 'f', designacion: '−P4' },
  { id: 'i2', designacion: '−P5' },
  { id: 'i3', designacion: '−P6' },
  { id: 'hs', designacion: '−P8' },
] as const;

export const ROTULO_ESTADO: Record<BuqueDemo['estado'], string> = {
  navegando: 'Navegando',
  alarma: 'Alarma',
  puerto: 'En puerto',
  'sin-enlace': 'Sin enlace',
};

const INDICES = new Map(LECTURAS.map((l, i) => [l.id, i]));

export function indiceDe(id: string) {
  const i = INDICES.get(id);
  if (i === undefined) throw new Error(`No hay lectura ${id}`);
  return i;
}

export function lecturaDe(id: string) {
  return LECTURAS[indiceDe(id)];
}

/* --------------------------- Azar reproducible ---------------------------
   LECTURAS describe el frente de un solo buque. Para que cada casco tenga su
   propio registro sin inventar una segunda fuente de datos, cada magnitud se
   deriva de la misma base con un factor de régimen y un desvío fijo por buque. */

function semilla(txt: string) {
  let h = 2166136261;
  for (let i = 0; i < txt.length; i += 1) {
    h ^= txt.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function azar(inicial: number) {
  let estado = inicial;
  return () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Régimen de trabajo por estado. LECTURAS es el frente del buque en alarma, así
 * que ese estado es el 1,0 y los demás se derivan de él: navegando carga menos,
 * en puerto el buque está tomando alimentación de tierra y la máquina está fría.
 */
const REGIMEN: Record<BuqueDemo['estado'], Record<string, number>> = {
  alarma: { u12: 1, f: 1, i1: 1, i2: 1, i3: 1, cos: 1, tb: 1, hs: 1 },
  navegando: { u12: 0.995, f: 1, i1: 0.92, i2: 0.93, i3: 0.91, cos: 1.02, tb: 0.79, hs: 1 },
  puerto: { u12: 1.013, f: 1, i1: 0.2, i2: 0.21, i3: 0.19, cos: 1.07, tb: 0.44, hs: 1 },
  'sin-enlace': { u12: 0.99, f: 1, i1: 0.9, i2: 0.9, i3: 0.92, cos: 1.0, tb: 0.77, hs: 1 },
};

function desvio(buque: string, id: string) {
  const r = azar(semilla(`${buque}|${id}`));
  /* Las horas de servicio son la edad del equipo, no una medición: cada casco
     tiene la suya y la diferencia es grande. Todo lo demás apenas se corre. */
  const amplitud = id === 'hs' ? 0.35 : 0.015;
  return 1 + (r() - 0.5) * 2 * amplitud;
}

function ajustar(b: BuqueDemo, id: string, valor: number) {
  return valor * (REGIMEN[b.estado][id] ?? 1) * desvio(b.buque, id);
}

/** El valor de reposo de una magnitud en un buque: donde queda la pluma. */
export function baseDe(b: BuqueDemo, id: string) {
  return ajustar(b, id, lecturaDe(id).valor);
}

/**
 * El valor de AHORA, derivado del único ProveedorVivo del mundo.
 *
 * Un buque sin enlace no tiene valor de ahora, y devolver el último conocido
 * sería exactamente lo que este producto promete no hacer.
 */
export function vivoDe(b: BuqueDemo, id: string, valores: number[]): number | null {
  if (b.estado === 'sin-enlace') return null;
  return ajustar(b, id, valores[indiceDe(id)]);
}

/** Índice de la última muestra que llegó. Después de ahí el papel está en blanco. */
export function corteDe(b: BuqueDemo) {
  const faltan = Math.min(MUESTRAS - 1, Math.round(b.hace / PASO_MIN));
  return Math.max(6, MUESTRAS - 1 - faltan);
}

function acotar(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * La carga del buque a lo largo del papel. Es una sola curva por casco y las
 * cuatro plumas escriben derivadas de ella, que es lo que hace legible un
 * registrador: el escalón de corriente, la caída de tensión, el desplome del
 * coseno y el calentamiento posterior son el mismo hecho visto por cuatro
 * instrumentos, no cuatro dibujos independientes.
 *
 * Un arrastrero pide potencia al guinche cada cuatro o cinco horas durante
 * unos cincuenta minutos: esa es la virada, y es el accidente que el papel
 * tiene que mostrar.
 */
function cargaDe(b: BuqueDemo, corte: number) {
  const r = azar(semilla(`${b.buque}|carga`));
  const amarre = corte - 54; /* entró a puerto hace nueve horas */
  const primera = Math.floor(r() * 18);
  const periodo = 26 + Math.floor(r() * 8);
  const largo = 4 + Math.floor(r() * 3);

  const carga: number[] = [];
  let suave = 0.55;
  for (let i = 0; i <= corte; i += 1) {
    const amarrado = b.estado === 'puerto' && i >= amarre;
    let objetivo = amarrado ? 0.12 : 0.55;
    if (!amarrado) {
      const fase = (i - primera) % periodo;
      if (fase >= 0 && fase < largo) objetivo = 0.94;
    }
    /* La máquina no salta de un escalón al otro: tarda dos o tres muestras. */
    suave += (objetivo - suave) * 0.42;
    carga.push(suave + (r() - 0.5) * 0.018);
  }
  return carga;
}

/** Cuánto se mueve cada magnitud entre carga cero y carga plena. */
const RESPUESTA: Record<string, number> = {
  u12: -16, /* la barra cae bajo carga */
  i1: 150,
  cos: -0.1, /* más carga inductiva, peor coseno */
  tb: 22,
};

/**
 * La traza. `null` es papel en blanco: no hubo reporte, y eso se dibuja como lo
 * que es. La última muestra real cae exactamente en la base, así que la pluma
 * arranca donde termina la tinta.
 */
export function serie(b: BuqueDemo, canal: Canal): (number | null)[] {
  const base = baseDe(b, canal.id);
  const corte = corteDe(b);
  const rango = canal.max - canal.min;
  const carga = cargaDe(b, corte);

  /* El bobinado no sigue a la carga: la integra. Un pasabajos largo es lo que
     convierte una virada de cincuenta minutos en una loma de dos horas. */
  let termico = carga[0];
  const forma = carga.map((c) => {
    if (canal.id !== 'tb') return c;
    termico += (c - termico) * 0.06;
    return termico;
  });

  /* La avería de Luigi: seis horas de calentamiento que terminan cruzando el
     máximo. Vale cero en la última muestra, así que no mueve el valor de ahora. */
  const arranque = corte - 36;
  const deriva = (i: number) =>
    b.estado === 'alarma' && canal.id === 'tb'
      ? -14 * (1 - acotar((i - arranque) / 36, 0, 1))
      : 0;

  const r = azar(semilla(`${b.buque}|${canal.id}|papel`));
  const respuesta = RESPUESTA[canal.id] ?? 0;
  const ruidoMax = rango * 0.006;

  const puntos: (number | null)[] = new Array(MUESTRAS).fill(null);
  let ruido = 0;
  for (let i = 0; i <= corte; i += 1) {
    ruido = ruido * 0.7 + (r() - 0.5) * ruidoMax;
    const v =
      base +
      (forma[i] - forma[corte]) * respuesta +
      deriva(i) +
      (i === corte ? 0 : ruido);
    puntos[i] = acotar(v, canal.min, canal.max);
  }
  return puntos;
}

export function fueraDeRango(canal: Canal, valor: number | null) {
  return valor !== null && canal.limite !== undefined && valor > canal.limite.valor;
}

/* ------------------------------- Maniobra ------------------------------- */

export type Posicion = 'cerrado' | 'abierto' | 'desconocido';

export type Maniobra = {
  q5: Posicion;
  q6: Posicion;
  q7: Posicion;
  /** Qué está alimentando la barra, en el idioma del oficio. */
  barra: string;
};

/**
 * Qué generador está en barra. Sin enlace no se sabe, y decirlo es la respuesta
 * correcta: la posición de un interruptor no se deduce, se reporta.
 */
export function maniobraDe(b: BuqueDemo): Maniobra {
  if (b.estado === 'sin-enlace') {
    return { q5: 'desconocido', q6: 'desconocido', q7: 'desconocido', barra: 'Sin reporte' };
  }
  if (b.estado === 'puerto') {
    return { q5: 'abierto', q6: 'abierto', q7: 'cerrado', barra: 'Alimentación de puerto' };
  }
  /* Maria Eugenia navega con el segundo grupo, como ya dice la flota. */
  const conG2 = b.buque === 'Maria Eugenia';
  return {
    q5: conG2 ? 'abierto' : 'cerrado',
    q6: conG2 ? 'cerrado' : 'abierto',
    q7: 'abierto',
    barra: conG2 ? 'G2 en barra' : 'G1 en barra',
  };
}

/* ------------------------------- Formato ------------------------------- */

/** "hace 6 h 58 min". Sin reloj: todo se mide contra el último reporte. */
export function haceTexto(minutos: number) {
  if (minutos <= 0) return 'ahora';
  if (minutos < 60) return `hace ${Math.round(minutos)} min`;
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  return m === 0 ? `hace ${h} h` : `hace ${h} h ${m} min`;
}

/** Los minutos que representa una muestra de la faja. */
export function minutosDe(indice: number) {
  return (MUESTRAS - 1 - indice) * PASO_MIN;
}

export function formatear(canal: Canal, valor: number | null) {
  if (valor === null) return '—';
  return valor.toFixed(canal.decimales);
}

/**
 * La coordenada del eje, en el mismo idioma que las marcas impresas en el
 * papel. "Regla en hace 14 h" compone mal; el eje dice −14 h y la regla también.
 */
export function marcaTexto(minutos: number) {
  if (minutos <= 0) return 'Ahora';
  if (minutos < 60) return `−${Math.round(minutos)} min`;
  const h = minutos / 60;
  return `−${Number.isInteger(h) ? h : h.toFixed(1).replace('.', ',')} h`;
}
