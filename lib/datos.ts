/**
 * Verdad de producto y datos de demostración.
 *
 * `OBRAS`, `CLIENTES`, `CONTACTO` y `ALCANCE` son hechos reales publicados por
 * Tecvol en tecvol.com.ar. No se editan sin confirmarlo con el cliente.
 *
 * `LECTURAS` y `FLOTA_DEMO` son DATOS SINTÉTICOS, escritos para que la landing
 * pueda mostrar el producto funcionando. No representan mediciones reales y la
 * interfaz los etiqueta como demostración en todos lados donde se muestran.
 */

/* ----------------------------- Real ----------------------------- */

export const CONTACTO = {
  direccion: 'Lanzilota 1254, Mar del Plata, Argentina',
  telefono: '+54 9 (0223) 489-7905',
  whatsapp: '+54 223 422-6722',
  whatsappUrl: 'https://wa.me/+5492234226722',
  email: 'info@tecvol.com.ar',
  instagram: 'https://www.instagram.com/tecvol.ar/',
  sitio: 'https://tecvol.com.ar',
} as const;

/** Obras publicadas por Tecvol. Nombres reales de buque. */
export const OBRAS = [
  { buque: 'Luigi', trabajo: 'Construcción eléctrica' },
  { buque: 'Anita', trabajo: 'Construcción eléctrica' },
  { buque: 'Maria Eugenia', trabajo: 'Tablero principal' },
  { buque: 'Luca Mario', trabajo: 'Tablero principal' },
  { buque: 'Don Francisco', trabajo: 'Tablero de repotenciación' },
  { buque: 'Domaio', trabajo: 'Tablero de repotenciación' },
  { buque: 'Scirocco', trabajo: 'Tablero de repotenciación' },
] as const;

/** Empresas cuyos logos Tecvol publica bajo "Confían en Tecvol". */
export const CLIENTES = ['SPI', 'Acay', 'Moscuzza', 'Ártico', 'Solimeno'] as const;

/** Servicios declarados en el sitio institucional. */
export const ALCANCE = [
  {
    titulo: 'Tablero principal',
    detalle: 'Barras, interruptores y control de potencia del buque.',
  },
  {
    titulo: 'Luces de navegación',
    detalle: 'Tableros reglamentarios aprobados por PNA.',
  },
  {
    titulo: 'Servicios de 24 V',
    detalle: 'Tableros de continua reglamentarios aprobados por PNA.',
  },
  {
    titulo: 'Control de generación',
    detalle: 'Sistemas COMAP de arranque, reparto de carga y protección.',
  },
] as const;

/* -------------------- Demostración (sintético) -------------------- */

export type Lectura = {
  id: string;
  etiqueta: string;
  unidad: string;
  valor: number;
  decimales: number;
  /** Amplitud del temblor de instrumento, en unidades de la magnitud. */
  deriva: number;
  estado: 'normal' | 'atencion';
};

/** DATOS SINTÉTICOS — frente del tablero principal, plano 1. */
export const LECTURAS: Lectura[] = [
  { id: 'u12', etiqueta: 'Tensión de barra', unidad: 'V', valor: 383, decimales: 0, deriva: 1.4, estado: 'normal' },
  { id: 'f', etiqueta: 'Frecuencia', unidad: 'Hz', valor: 50.0, decimales: 1, deriva: 0.06, estado: 'normal' },
  { id: 'i1', etiqueta: 'Corriente L1', unidad: 'A', valor: 214, decimales: 0, deriva: 3.5, estado: 'normal' },
  { id: 'i2', etiqueta: 'Corriente L2', unidad: 'A', valor: 209, decimales: 0, deriva: 3.5, estado: 'normal' },
  { id: 'i3', etiqueta: 'Corriente L3', unidad: 'A', valor: 221, decimales: 0, deriva: 3.5, estado: 'normal' },
  { id: 'cos', etiqueta: 'Factor de potencia', unidad: '', valor: 0.87, decimales: 2, deriva: 0.01, estado: 'normal' },
  { id: 'tb', etiqueta: 'Temp. bobinado G1', unidad: '°C', valor: 78, decimales: 0, deriva: 0.6, estado: 'atencion' },
  { id: 'hs', etiqueta: 'Horas de servicio', unidad: 'h', valor: 11482, decimales: 0, deriva: 0, estado: 'normal' },
];

export type BuqueDemo = {
  buque: string;
  estado: 'navegando' | 'alarma' | 'puerto' | 'sin-enlace';
  detalle: string;
  /** Minutos desde el último reporte del microcontrolador. */
  hace: number;
};

/** DATOS SINTÉTICOS — vista de flota, plano 3. Los nombres de buque sí son reales. */
export const FLOTA_DEMO: BuqueDemo[] = [
  { buque: 'Luigi', estado: 'alarma', detalle: 'Temp. bobinado G1 · 78 °C', hace: 2 },
  { buque: 'Anita', estado: 'navegando', detalle: 'G1 en barra · 383 V', hace: 3 },
  { buque: 'Maria Eugenia', estado: 'navegando', detalle: 'G2 en barra · 381 V', hace: 1 },
  { buque: 'Luca Mario', estado: 'sin-enlace', detalle: 'Fuera de cobertura', hace: 418 },
  { buque: 'Don Francisco', estado: 'puerto', detalle: 'Alimentación de puerto', hace: 6 },
  { buque: 'Domaio', estado: 'navegando', detalle: 'G1 en barra · 379 V', hace: 4 },
  { buque: 'Scirocco', estado: 'puerto', detalle: 'Tablero sin tensión', hace: 12 },
];

export const ETIQUETA_DEMO = 'Datos de demostración';

/**
 * Familias de instalación donde el equipamiento que Tecvol fabrica ya se usa.
 *
 * Son SECTORES, no clientes. Nombrar una empresa acá sería afirmar una relación
 * comercial que nadie confirmó, y eso es exactamente lo que este proyecto no
 * inventa. `parque` dice la verdad de cada fila por separado: dónde Tecvol tiene
 * obra ejecutada y dónde todavía no.
 *
 * El producto se instala sobre equipamiento que ya está trabajando y el equipo no
 * tiene que ser de Tecvol: `equipo` es lo que se monitorea, no lo que se fabrica.
 */
export const APLICACIONES = [
  {
    sector: 'Buque pesquero',
    equipo: 'Tablero principal, generadores y luces de navegación reglamentarias.',
    pregunta: '¿Sale a navegar cuando tiene que salir?',
    parque: 'Siete cascos con obra Tecvol.',
    ejecutado: true,
  },
  {
    sector: 'Planta industrial',
    equipo: 'Tableros de potencia, motores y cámaras de frío.',
    pregunta: '¿La cámara sostuvo la cadena de frío toda la noche?',
    parque: 'Montajes industriales ejecutados.',
    ejecutado: true,
  },
  {
    sector: 'Edificio crítico',
    equipo: 'Tableros de emergencia, grupo y transferencia automática.',
    pregunta: '¿El grupo arranca solo cuando se corta la red?',
    parque: 'Sin obra ejecutada todavía.',
    ejecutado: false,
  },
] as const;
