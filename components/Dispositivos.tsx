'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Dispositivo, Magnitud } from '@/lib/dispositivos/padron';
import {
  aClave,
  aUmbral,
  esSerial,
  LARGO_SERIAL,
  MINIMO_SERIAL,
  normalizarSerial,
  umbralValido,
} from '@/lib/dispositivos/reglas';
import type { Hermana } from '@/lib/navegacion';
import type { Lectura } from '@/lib/telemetria/mediciones';
import { cifraTexto, edadTexto } from '@/lib/telemetria/reglas';
import { Contexto, Interruptor, Persianas } from './instrumentos';

/**
 * Padrón de dispositivos (−A3).
 *
 * Los dispositivos son los microcontroladores que se instalan sobre el equipo
 * para que reporte. Esto es el padrón —qué hay declarado, con qué serial, dónde
 * está y entre qué valores se lo vigila— y no la telemetría: ninguna fila de
 * acá muestra una lectura, porque no hay ninguna que mostrar.
 *
 * Es la pantalla gemela de Personal y está escrita igual a propósito: el mismo
 * panel de registro, el mismo riel que baja, los mismos estados de error. Quien
 * entiende una entiende la otra.
 *
 * La diferencia es que acá entran dos permisos y no uno. Con `umbral:definir`
 * —el verbo del encargado— se llega a la pantalla, se ve el padrón y se fijan
 * los umbrales. Con `dispositivo:administrar` se declara un equipo, se lo
 * corrige, se lo pone fuera de servicio y se declara qué mide. La pantalla no
 * pregunta por ningún rol: recibe `puedeAdministrar` ya resuelto y dibuja lo
 * que corresponda. El servidor lo vuelve a decidir por su cuenta.
 */

/**
 * Qué riel está bajado. Uno por vez, como en Personal: abrir el alta cierra una
 * corrección a medio tipear, y al revés.
 */
type Panel =
  | null
  | { tipo: 'alta' }
  | { tipo: 'editar'; dispositivo: Dispositivo }
  | { tipo: 'magnitudes'; dispositivo: Dispositivo };

/** Qué riel es éste, en una cadena que se puede comparar. */
const claveDe = (panel: Panel) =>
  panel ? `${panel.tipo}:${'dispositivo' in panel ? panel.dispositivo.id : ''}` : '';

/* ------------------------------ Las lecturas ------------------------------ */

/**
 * Cada cuánto se vuelve a escribir la edad de un dato.
 *
 * Treinta segundos porque lo más chico que dice `edadTexto` es un minuto: más
 * seguido no cambiaría nada de lo que se ve, y más espaciado dejaría un renglón
 * diciendo «recién» cuando ya pasaron dos minutos.
 */
const TIC_MS = 30_000;

/**
 * El único reloj de la pantalla.
 *
 * Arranca en el instante que mandó el servidor —así el primer render del
 * navegador escribe exactamente lo mismo que se envió y no hay desajuste de
 * hidratación— y recién después de montar pasa al reloj de verdad.
 *
 * Uno solo para toda la pantalla, y no uno por fila: veinte renglones con su
 * propio intervalo son veinte relojes que se desfasan entre sí, y dos filas que
 * midieron lo mismo terminarían diciendo edades distintas.
 *
 * Que la edad corra no es un adorno: una pantalla abierta desde hace tres horas
 * mostrando «hace 2 min» es exactamente lo que el segundo principio del
 * producto prohíbe — presentar una lectura vieja como si fuera de ahora.
 */
function useReloj(inicial: number) {
  const [ahora, setAhora] = useState(inicial);
  useEffect(() => {
    const tic = () => setAhora(Date.now());
    tic();
    const reloj = setInterval(tic, TIC_MS);
    return () => clearInterval(reloj);
  }, []);
  return ahora;
}

/**
 * Lo último que dijo un equipo: la más reciente de las lecturas de todas sus
 * magnitudes.
 *
 * Se comparan las cadenas ISO directamente, sin parsearlas. Todas salen del
 * mismo `toISOString()` del servidor —mismo formato, mismo largo, siempre en
 * UTC— así que el orden alfabético y el cronológico son el mismo, y esto se
 * ejecuta una vez por renglón en cada tic.
 */
function ultimoDe(dispositivo: Dispositivo, ultimas: Record<string, Lectura>): Lectura | null {
  let masReciente: Lectura | null = null;
  for (const magnitud of dispositivo.magnitudes) {
    const lectura = ultimas[magnitud.id];
    if (lectura && (!masReciente || lectura.medidoEn > masReciente.medidoEn)) {
      masReciente = lectura;
    }
  }
  return masReciente;
}

/**
 * Qué tan viejo es lo último que dijo un equipo, al costado de su renglón.
 *
 * Es la primera pregunta que alguien le hace a un padrón donde ya entran
 * lecturas, y por eso está en la lista y no adentro del riel: «¿este equipo
 * está hablando?» se contesta antes de abrir nada.
 *
 * Un equipo que nunca reportó no se deja en blanco. El renglón dice que no hay
 * reportes, que es un hecho sobre la instalación —el fierro está declarado y
 * todavía no habló— y no un dato faltante.
 *
 * La edad se mide sobre `medidoEn` y no sobre `recibidoEn`, y ésa es la
 * pregunta correcta: lo que interesa es qué tan vieja es la medición, no qué
 * tan reciente fue la descarga. Un buque que vuelve a rango y sube quince días
 * juntos tiene lecturas de quince días, aunque hayan llegado hace un minuto.
 */
function Reporte({ lectura, ahora }: { lectura: Lectura | null; ahora: number }) {
  return (
    <span className={`reporte${lectura ? '' : ' reporte--mudo'}`}>
      <span className="cifra reporte__edad">
        {lectura ? edadTexto(ahora - Date.parse(lectura.medidoEn)) : '—'}
      </span>
      <span className="serigrafia reporte__pie">
        {lectura ? 'Último reporte' : 'Sin reportes'}
      </span>
    </span>
  );
}

export function Dispositivos({
  empresa,
  cliente,
  enServicio,
  fueraDeServicio,
  puedeAdministrar,
  ultimas,
  ahora: ahoraDelServidor,
  volver,
  hermanas,
}: {
  empresa: string;
  /** El identificador de la empresa, que es lo que viaja en el alta. */
  cliente: string;
  enServicio: Dispositivo[];
  /** Los que están dados de baja. Se muestran porque la baja tiene vuelta. */
  fueraDeServicio: Dispositivo[];
  /** Si esta sesión puede declarar equipos, además de fijarles umbrales. */
  puedeAdministrar: boolean;
  /**
   * La última lectura de cada magnitud, por id de magnitud. Lo que no está acá
   * es una magnitud que todavía no reportó nunca, que es el caso normal hoy.
   */
  ultimas: Record<string, Lectura>;
  /**
   * El instante en que el servidor dibujó esto.
   *
   * Viene como prop y no se lee un reloj acá adentro porque el primer render
   * del navegador tiene que escribir exactamente lo mismo que escribió el
   * servidor, o React reporta desajuste de hidratación. Después de montar, el
   * reloj de abajo lo reemplaza por el de verdad y sigue corriendo.
   */
  ahora: number;
  /**
   * Por dónde se sale, cuando se entró desde algún lado. El admin está en su
   * propia empresa y no tiene de dónde volver; el super entró desde el padrón
   * de clientes y tiene que poder ver que está adentro de una, y salir.
   */
  volver?: { href: string; rotulo: string };
  /** Las otras pantallas de esta misma empresa, cuando se está adentro de una. */
  hermanas?: Hermana[];
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const ahora = useReloj(ahoraDelServidor);

  /* Apretar el mando del riel que ya está bajado lo sube. Se compara por una
     clave y no campo por campo, para que «magnitudes de éste» y «magnitudes de
     aquél» sean dos rieles distintos y no el mismo abriéndose de nuevo. */
  const alternar = (siguiente: Exclude<Panel, null>) =>
    setPanel((antes) => (claveDe(antes) === claveDe(siguiente) ? null : siguiente));

  return (
    <main className="registro" id="contenido">
      <div className="marco">
        <div className="regleta registro__panel">
          <div className="regleta__chapa">
            <span className="serigrafia">−A3 · Padrón de dispositivos</span>
          </div>

          <div className="registro__cabeza">
            <div className="registro__texto">
              <Contexto volver={volver} hermanas={hermanas} />
              <h1>Dispositivos</h1>
              <p>
                Los microcontroladores declarados en {empresa}. Cada uno reporta una o
                varias magnitudes, y sobre cada magnitud se fija el mínimo y el máximo que
                disparan la alerta.
              </p>
            </div>

            {puedeAdministrar ? (
              <Interruptor
                designacion="−S4"
                className="registro__accion"
                onClick={() => alternar({ tipo: 'alta' })}
              >
                {panel?.tipo === 'alta' ? 'Cerrar alta' : 'Declarar dispositivo'}
              </Interruptor>
            ) : null}
          </div>

          {panel?.tipo === 'alta' ? (
            <AltaDispositivo cliente={cliente} alCerrar={() => setPanel(null)} />
          ) : null}

          {panel?.tipo === 'editar' ? (
            <AltaDispositivo
              key={panel.dispositivo.id}
              cliente={cliente}
              dispositivo={panel.dispositivo}
              alCerrar={() => setPanel(null)}
            />
          ) : null}

          {panel?.tipo === 'magnitudes' ? (
            <Magnitudes
              key={panel.dispositivo.id}
              dispositivo={panel.dispositivo}
              puedeAdministrar={puedeAdministrar}
              ultimas={ultimas}
              ahora={ahora}
              alCerrar={() => setPanel(null)}
            />
          ) : null}

          {enServicio.length ? (
            <ul className="registro__lista">
              {enServicio.map((dispositivo) => (
                <li className="hueco fila" key={dispositivo.id}>
                  <h2 className="fila__titulo">{dispositivo.rotulo}</h2>
                  <span className="fila__sub">
                    <span className="cifra">{dispositivo.serial}</span>
                    {dispositivo.ubicacion ? <> · {dispositivo.ubicacion}</> : null}
                  </span>
                  <span className="fila__aside">
                    <Reporte lectura={ultimoDe(dispositivo, ultimas)} ahora={ahora} />
                    {/* El chip dice cuántas magnitudes hay y abre el riel donde
                        se tocan: el dato y la acción son la misma cosa, que es
                        como se lee un borne. */}
                    <button
                      type="button"
                      className="fila__accion"
                      onClick={() => alternar({ tipo: 'magnitudes', dispositivo })}
                    >
                      Magnitudes · {dispositivo.magnitudes.length || 'ninguna'}
                      <span className="oculto-visual"> de {dispositivo.rotulo}</span>
                    </button>
                    {puedeAdministrar ? (
                      <button
                        type="button"
                        className="fila__accion"
                        onClick={() => alternar({ tipo: 'editar', dispositivo })}
                      >
                        Corregir
                        <span className="oculto-visual"> {dispositivo.rotulo}</span>
                      </button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="registro__lista">
              <div className="hueco vacio">
                <Persianas filas={6} />
                <p className="vacio__titulo">Todavía no hay dispositivos declarados.</p>
                <p className="vacio__detalle serigrafia">
                  {puedeAdministrar
                    ? 'El primero se declara con el mando de arriba.'
                    : 'Los declara el administrador de la empresa.'}
                </p>
              </div>
            </div>
          )}

          {fueraDeServicio.length ? (
            <FueraDeServicio
              dispositivos={fueraDeServicio}
              puedeAdministrar={puedeAdministrar}
              ultimas={ultimas}
              ahora={ahora}
            />
          ) : null}

          <p className="registro__nota">
            Un dispositivo declarado no es un dispositivo reportando. El monitoreo todavía
            no está instalado en ningún lado; la puerta por donde entran las mediciones ya
            existe, y lo que se vea acá entró por ahí. Cada lectura dice de cuándo es,
            porque un dato viejo mostrado como nuevo es peor que ninguno.
          </p>
        </div>
      </div>
    </main>
  );
}

/* -------------------------- Fuera de servicio -------------------------- */

/**
 * Los equipos dados de baja, al pie del padrón.
 *
 * Se muestran, y no es un lujo: el serial de un equipo dado de baja sigue
 * tomado —es el mismo fierro— así que sin verlos, quien dio uno de baja por
 * error se queda sin manera de volver a declararlo. Un equipo desconectado
 * sigue estando en el plano.
 */
function FueraDeServicio({
  dispositivos,
  puedeAdministrar,
  ultimas,
  ahora,
}: {
  dispositivos: Dispositivo[];
  puedeAdministrar: boolean;
  ultimas: Record<string, Lectura>;
  ahora: number;
}) {
  const router = useRouter();
  const [volviendo, setVolviendo] = useState<string | null>(null);

  const volver = async (id: string) => {
    setVolviendo(id);
    try {
      await fetch(`/api/dispositivos/${id}/servicio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enServicio: true }),
      });
    } catch {
      /* En este producto quedarse sin señal es normal. El refresco de abajo
         vuelve a leer lo que hay: si no se aplicó, la fila sigue acá. */
    }
    setVolviendo(null);
    router.refresh();
  };

  return (
    <section className="registro__baja">
      <h2 className="serigrafia registro__baja-chapa">Fuera de servicio</h2>
      <ul className="registro__lista">
        {dispositivos.map((dispositivo) => (
          <li className="hueco fila fila--apagada" key={dispositivo.id}>
            <h3 className="fila__titulo">{dispositivo.rotulo}</h3>
            <span className="fila__sub">
              <span className="cifra">{dispositivo.serial}</span>
              {dispositivo.ubicacion ? <> · {dispositivo.ubicacion}</> : null}
            </span>
            {/* Un equipo dado de baja que igual sigue reportando es justo lo
                que hay que poder ver: sus lecturas se guardan —el fierro está
                hablando y negarlo no lo hace callar— y acá se dice desde
                cuándo. Se muestra aunque esta sesión no pueda devolverlo al
                servicio: el hecho es el mismo para los dos permisos. */}
            <span className="fila__aside">
              <Reporte lectura={ultimoDe(dispositivo, ultimas)} ahora={ahora} />
              {puedeAdministrar ? (
                <button
                  type="button"
                  className="fila__accion"
                  disabled={volviendo === dispositivo.id}
                  onClick={() => volver(dispositivo.id)}
                >
                  {volviendo === dispositivo.id ? 'Volviendo…' : 'Volver al servicio'}
                  <span className="oculto-visual"> a {dispositivo.rotulo}</span>
                </button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Estado = 'listo' | 'dando' | 'ok';

/* ------------- El riel del dispositivo: alta y corrección (−X3) ------------- */

/**
 * El mismo riel para declarar un equipo y para corregirlo.
 *
 * Son los mismos tres bornes y el mismo pulsador; lo único que cambia es la
 * chapa, que dice cuál de los dos se está haciendo. Dos rieles distintos para
 * los mismos campos serían dos lugares donde arreglar el mismo error de tipeo.
 *
 * En corrección aparece además el borne del servicio. La baja va acá adentro y
 * no como un chip en la fila del padrón, a propósito: sacar un equipo de
 * servicio es una decisión que se toma mirando sus datos, no de un tirón
 * pasando el dedo por un renglón.
 */
function AltaDispositivo({
  cliente,
  dispositivo,
  alCerrar,
}: {
  cliente: string;
  /** Si viene, es una corrección; si no, un alta. */
  dispositivo?: Dispositivo;
  alCerrar: () => void;
}) {
  const router = useRouter();
  const corrige = Boolean(dispositivo);
  const [rotulo, setRotulo] = useState(dispositivo?.rotulo ?? '');
  const [serial, setSerial] = useState(dispositivo?.serial ?? '');
  const [ubicacion, setUbicacion] = useState(dispositivo?.ubicacion ?? '');
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>('listo');
  const aviso = useRef<HTMLDivElement>(null);
  const primero = useRef<HTMLInputElement>(null);

  /* El riel se abrió por una acción del usuario: el foco va al primer borne. */
  useEffect(() => {
    primero.current?.focus();
  }, []);

  const fallar = (mensaje: string) => {
    setEstado('listo');
    setError(mensaje);
    aviso.current?.focus();
  };

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();

    if (!rotulo.trim() || !serial.trim()) {
      fallar('Faltan datos: el rótulo y el serial son obligatorios.');
      return;
    }

    /* El servidor lo vuelve a decidir por su cuenta. Esto está acá para que un
       error de tipeo se vea ahora y no después de mandar el pedido. */
    if (!esSerial(serial)) {
      fallar(
        `Ese serial no se puede usar. Va entre ${MINIMO_SERIAL} y ${LARGO_SERIAL} caracteres, sin espacios: letras, números, guiones y puntos.`,
      );
      return;
    }

    setError(null);
    setEstado('dando');

    const cuerpo = JSON.stringify({
      rotulo: rotulo.trim(),
      serial: normalizarSerial(serial),
      ubicacion: ubicacion.trim(),
      /* La empresa donde cae el alta. El servidor no la cree: la pasa por
         `alcanzaCliente` antes de escribir nada. En la corrección ni se manda:
         un equipo no se muda de empresa desde un formulario. */
      ...(corrige ? {} : { cliente }),
    });

    let respuesta: Response;
    try {
      respuesta = await fetch(
        corrige ? `/api/dispositivos/${dispositivo!.id}` : '/api/dispositivos',
        {
          method: corrige ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: cuerpo,
        },
      );
    } catch {
      /* En este producto quedarse sin señal es normal, no una falla. */
      fallar('No hay enlace con el servidor. Revisá la conexión y probá de nuevo.');
      return;
    }

    const leido = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
      fallar(typeof leido?.mensaje === 'string' ? leido.mensaje : 'No se pudo guardar.');
      return;
    }

    setEstado('ok');
    alCerrar();
    /* La lista la arma el servidor: se le pide que la relea en vez de meter la
       fila a mano acá, así lo que se ve es lo que quedó guardado. */
    router.refresh();
  };

  const sacarDeServicio = async () => {
    setEstado('dando');
    try {
      const respuesta = await fetch(`/api/dispositivos/${dispositivo!.id}/servicio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enServicio: false }),
      });
      if (!respuesta.ok) {
        const leido = await respuesta.json().catch(() => null);
        fallar(typeof leido?.mensaje === 'string' ? leido.mensaje : 'No se pudo dar de baja.');
        return;
      }
    } catch {
      fallar('No hay enlace con el servidor. Revisá la conexión y probá de nuevo.');
      return;
    }
    setEstado('ok');
    alCerrar();
    router.refresh();
  };

  const malo = Boolean(error);

  return (
    <form className="regleta regleta--alta" onSubmit={enviar} noValidate>
      <div className="regleta__chapa">
        <span className="serigrafia">
          {corrige ? `−X3 · Corrección de ${dispositivo!.rotulo}` : '−X3 · Alta de dispositivo'}
        </span>
      </div>

      {error && (
        <div className="aviso aviso--error regleta__aviso" role="alert" tabIndex={-1} ref={aviso}>
          {error}
        </div>
      )}

      <div className="regleta__riel">
        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="dispositivo-rotulo">
              Rótulo
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X3:1
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="dispositivo-rotulo"
              name="dispositivo-rotulo"
              type="text"
              className="campo__entrada"
              value={rotulo}
              onChange={(e) => setRotulo(e.target.value)}
              ref={primero}
              autoComplete="off"
              aria-describedby="dispositivo-rotulo-pie"
              aria-invalid={malo || undefined}
            />
          </span>
          <span className="borne__pie" id="dispositivo-rotulo-pie">
            Cómo se lo nombra en pantalla: «Tablero principal», «Grupo 1».
          </span>
        </p>

        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="dispositivo-serial">
              Serial
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X3:2
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="dispositivo-serial"
              name="dispositivo-serial"
              type="text"
              className="campo__entrada cifra"
              value={serial}
              onChange={(e) => setSerial(e.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-describedby="dispositivo-serial-pie"
              aria-invalid={malo || undefined}
            />
          </span>
          <span className="borne__pie" id="dispositivo-serial-pie">
            El que trae grabado el microcontrolador. Con eso se va a reconocer solo cuando
            reporte, así que copialo tal cual: si está mal, su lectura no va a tener dueño.
          </span>
        </p>

        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="dispositivo-ubicacion">
              Ubicación
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X3:3
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="dispositivo-ubicacion"
              name="dispositivo-ubicacion"
              type="text"
              className="campo__entrada"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              autoComplete="off"
              aria-describedby="dispositivo-ubicacion-pie"
            />
          </span>
          <span className="borne__pie" id="dispositivo-ubicacion-pie">
            Dónde está montado: el buque, la sala. Se puede dejar vacío.
          </span>
        </p>

        <div className="borne borne--llave">
          <Interruptor type="submit" designacion="−Q3" disabled={estado !== 'listo'}>
            {estado === 'listo'
              ? corrige
                ? 'Guardar'
                : 'Declarar'
              : corrige
                ? 'Guardando…'
                : 'Declarando…'}
          </Interruptor>
        </div>

        {corrige ? (
          <div className="borne borne--ancho">
            <span className="borne__cabeza">
              <span className="campo__etiqueta">Servicio</span>
              <span className="serigrafia borne__designacion" aria-hidden="true">
                −X3:4
              </span>
            </span>
            <span>
              <button
                type="button"
                className="fila__accion"
                disabled={estado !== 'listo'}
                onClick={sacarDeServicio}
              >
                Poner fuera de servicio
                <span className="oculto-visual"> a {dispositivo!.rotulo}</span>
              </button>
            </span>
            <span className="borne__pie">
              Sale del padrón activo y deja de esperarse su reporte. Sus magnitudes y sus
              umbrales quedan guardados, y volvés a ponerlo en servicio desde el pie de esta
              misma pantalla.
            </span>
          </div>
        ) : null}
      </div>
    </form>
  );
}

/* ------------------- El riel de las magnitudes (−X4) ------------------- */

/** Lo que se está tipeando sobre una magnitud, antes de que se guarde. */
type Borrador = { min: string; max: string; quitar: boolean };

const enTexto = (valor: number | null) => (valor === null ? '' : String(valor));

/**
 * Las magnitudes de un dispositivo y sus umbrales, en un solo riel.
 *
 * Un borne por magnitud, numerados correlativos, y el último libre para
 * conectar una nueva — que es exactamente cómo se lee una regleta de verdad.
 * Un solo pulsador al final: nada sale hasta apretar −Q4, y por eso quitar una
 * magnitud es marcarla y no un pedido inmediato.
 *
 * Los dos permisos conviven acá adentro y se ven distinto. El encargado ve los
 * bornes de mínimo y máximo y nada más: no puede declarar una magnitud nueva ni
 * quitar una, porque qué mide un equipo es parte del equipo. El administrador
 * ve todo.
 */
function Magnitudes({
  dispositivo,
  puedeAdministrar,
  ultimas,
  ahora,
  alCerrar,
}: {
  dispositivo: Dispositivo;
  puedeAdministrar: boolean;
  ultimas: Record<string, Lectura>;
  ahora: number;
  alCerrar: () => void;
}) {
  const router = useRouter();
  const [borradores, setBorradores] = useState<Record<string, Borrador>>(() =>
    Object.fromEntries(
      dispositivo.magnitudes.map((m) => [
        m.id,
        { min: enTexto(m.min), max: enTexto(m.max), quitar: false },
      ]),
    ),
  );
  const [nueva, setNueva] = useState({ rotulo: '', unidad: '', min: '', max: '' });
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>('listo');
  const aviso = useRef<HTMLDivElement>(null);

  const fallar = (mensaje: string) => {
    setEstado('listo');
    setError(mensaje);
    aviso.current?.focus();
  };

  const tocar = (id: string, cambio: Partial<Borrador>) =>
    setBorradores((antes) => ({ ...antes, [id]: { ...antes[id], ...cambio } }));

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();

    /* Todo se valida antes de mandar nada. Con varios pedidos en juego, un
       número mal tipeado en el último borne no puede aparecer después de que
       los tres primeros ya se guardaron. */
    for (const magnitud of dispositivo.magnitudes) {
      const borrador = borradores[magnitud.id];
      if (borrador.quitar) continue;
      const min = aUmbral(borrador.min);
      const max = aUmbral(borrador.max);
      if (min === undefined || max === undefined) {
        fallar(`En «${magnitud.rotulo}», el mínimo y el máximo tienen que ser números o quedar vacíos.`);
        return;
      }
      if (!umbralValido(min, max)) {
        fallar(`En «${magnitud.rotulo}», el mínimo no puede ser mayor que el máximo.`);
        return;
      }
    }

    const declara = puedeAdministrar && Boolean(nueva.rotulo.trim());
    if (declara) {
      if (!aClave(nueva.rotulo)) {
        fallar('De ese rótulo no sale ninguna clave. Tiene que llevar al menos una letra o un número.');
        return;
      }
      const min = aUmbral(nueva.min);
      const max = aUmbral(nueva.max);
      if (min === undefined || max === undefined) {
        fallar('En la magnitud nueva, el mínimo y el máximo tienen que ser números o quedar vacíos.');
        return;
      }
      if (!umbralValido(min, max)) {
        fallar('En la magnitud nueva, el mínimo no puede ser mayor que el máximo.');
        return;
      }
    }

    setError(null);
    setEstado('dando');

    const base = `/api/dispositivos/${dispositivo.id}/magnitudes`;

    /* Secuencial y parando en el primer error. Si algo falla a la mitad, lo que
       ya se aplicó queda aplicado y el refresco de abajo lo muestra: es más
       honesto que fingir que no pasó nada. */
    try {
      for (const magnitud of dispositivo.magnitudes) {
        const borrador = borradores[magnitud.id];

        if (borrador.quitar) {
          const fuera = await fetch(`${base}/${magnitud.id}`, { method: 'DELETE' });
          if (!fuera.ok) {
            fallar(await mensajeDe(fuera, `No se pudo quitar «${magnitud.rotulo}».`));
            return;
          }
          continue;
        }

        /* Sólo las que cambiaron: un riel con ocho magnitudes no manda ocho
           pedidos porque alguien tocó una. */
        if (borrador.min === enTexto(magnitud.min) && borrador.max === enTexto(magnitud.max)) {
          continue;
        }

        const puesta = await fetch(`${base}/${magnitud.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ min: borrador.min, max: borrador.max }),
        });
        if (!puesta.ok) {
          fallar(await mensajeDe(puesta, `No se pudo fijar el umbral de «${magnitud.rotulo}».`));
          return;
        }
      }

      if (declara) {
        const alta = await fetch(base, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rotulo: nueva.rotulo.trim(),
            unidad: nueva.unidad.trim(),
            min: nueva.min,
            max: nueva.max,
          }),
        });
        if (!alta.ok) {
          fallar(await mensajeDe(alta, 'No se pudo declarar la magnitud.'));
          return;
        }
      }
    } catch {
      fallar('No hay enlace con el servidor. Revisá la conexión y probá de nuevo.');
      return;
    }

    setEstado('ok');
    alCerrar();
    router.refresh();
  };

  const siguiente = dispositivo.magnitudes.length + 1;

  return (
    <form className="regleta regleta--alta" onSubmit={enviar} noValidate>
      <div className="regleta__chapa">
        <span className="serigrafia">−X4 · Magnitudes de {dispositivo.rotulo}</span>
      </div>

      {error && (
        <div className="aviso aviso--error regleta__aviso" role="alert" tabIndex={-1} ref={aviso}>
          {error}
        </div>
      )}

      {!dispositivo.magnitudes.length && !puedeAdministrar ? (
        <div className="aviso aviso--atencion regleta__aviso">
          Este dispositivo todavía no tiene ninguna magnitud declarada. Las declara el
          administrador de la empresa; después vos les fijás los umbrales.
        </div>
      ) : null}

      <div className="regleta__riel">
        {dispositivo.magnitudes.map((magnitud, i) => (
          <BorneUmbral
            key={magnitud.id}
            magnitud={magnitud}
            designacion={`−X4:${i + 1}`}
            /* La lectura tiene designación propia y no la del borne: es un
               instrumento montado adentro, no un campo más del formulario. −P9
               en adelante, que es el tramo libre del esquema para una lectura. */
            designacionLectura={`−P${9 + i}`}
            ultima={ultimas[magnitud.id] ?? null}
            ahora={ahora}
            borrador={borradores[magnitud.id]}
            puedeQuitar={puedeAdministrar}
            alTocar={(cambio) => tocar(magnitud.id, cambio)}
          />
        ))}

        {puedeAdministrar ? (
          <div className="borne borne--ancho">
            <span className="borne__cabeza">
              {/* El rótulo del borne no es un `label`: los campos de adentro
                  tienen el suyo, y dos `for` sobre el mismo input hacen que un
                  lector de pantalla anuncie «declarar una magnitud» donde
                  tendría que decir «qué mide». */}
              <span className="campo__etiqueta">Declarar una magnitud</span>
              <span className="serigrafia borne__designacion" aria-hidden="true">
                −X4:{siguiente}
              </span>
            </span>
            <span className="umbral">
              <span className="umbral__campo umbral__campo--ancho">
                <label className="umbral__rotulo" htmlFor="magnitud-rotulo">
                  Qué mide
                </label>
                <span className="hueco hueco--campo">
                  <input
                    id="magnitud-rotulo"
                    name="magnitud-rotulo"
                    type="text"
                    className="campo__entrada"
                    value={nueva.rotulo}
                    onChange={(e) => setNueva((a) => ({ ...a, rotulo: e.target.value }))}
                    autoComplete="off"
                  />
                </span>
              </span>
              <span className="umbral__campo umbral__campo--angosto">
                <label className="umbral__rotulo" htmlFor="magnitud-unidad">
                  Unidad
                </label>
                <span className="hueco hueco--campo">
                  <input
                    id="magnitud-unidad"
                    name="magnitud-unidad"
                    type="text"
                    className="campo__entrada"
                    value={nueva.unidad}
                    onChange={(e) => setNueva((a) => ({ ...a, unidad: e.target.value }))}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </span>
              </span>
              <span className="umbral__campo umbral__campo--angosto">
                <label className="umbral__rotulo" htmlFor="magnitud-min">
                  Mínimo
                </label>
                <span className="hueco hueco--campo">
                  <input
                    id="magnitud-min"
                    name="magnitud-min"
                    type="text"
                    className="campo__entrada cifra"
                    inputMode="decimal"
                    value={nueva.min}
                    onChange={(e) => setNueva((a) => ({ ...a, min: e.target.value }))}
                    autoComplete="off"
                  />
                </span>
              </span>
              <span className="umbral__campo umbral__campo--angosto">
                <label className="umbral__rotulo" htmlFor="magnitud-max">
                  Máximo
                </label>
                <span className="hueco hueco--campo">
                  <input
                    id="magnitud-max"
                    name="magnitud-max"
                    type="text"
                    className="campo__entrada cifra"
                    inputMode="decimal"
                    value={nueva.max}
                    onChange={(e) => setNueva((a) => ({ ...a, max: e.target.value }))}
                    autoComplete="off"
                  />
                </span>
              </span>
            </span>
            <span className="borne__pie">
              {aClave(nueva.rotulo) ? (
                <>
                  Con esto la va a nombrar el equipo:{' '}
                  <span className="cifra">{aClave(nueva.rotulo)}</span>
                </>
              ) : (
                'Tensión de barra, corriente, temperatura de bobinado. La unidad y los umbrales se pueden dejar vacíos.'
              )}
            </span>
          </div>
        ) : null}

        <div className="borne borne--llave">
          <Interruptor type="submit" designacion="−Q4" disabled={estado !== 'listo'}>
            {estado === 'listo' ? 'Guardar' : 'Guardando…'}
          </Interruptor>
        </div>
      </div>
    </form>
  );
}

/**
 * Cuánto se tiene que haber demorado una lectura para que valga decirlo.
 *
 * Diez minutos: por debajo de eso la diferencia entre cuándo se midió y cuándo
 * llegó es el viaje normal de un mensaje, y anotarla en cada borne sería una
 * línea de ruido en todos ellos.
 */
const DEMORA_QUE_IMPORTA_MS = 10 * 60_000;

const demorada = (lectura: Lectura) =>
  Date.parse(lectura.recibidoEn) - Date.parse(lectura.medidoEn) > DEMORA_QUE_IMPORTA_MS;

/**
 * Un borne de magnitud: lo que mide, entre qué valores, y si se va.
 *
 * Marcada para quitar, el borne se apaga y sus campos se bloquean en vez de
 * desaparecer. Una fila que se borra de la pantalla antes de guardar deja a
 * quien la marcó sin saber qué está por mandar, y sin manera de arrepentirse.
 */
function BorneUmbral({
  magnitud,
  designacion,
  designacionLectura,
  ultima,
  ahora,
  borrador,
  puedeQuitar,
  alTocar,
}: {
  magnitud: Magnitud;
  designacion: string;
  designacionLectura: string;
  /** Lo último que reportó esta magnitud, o `null` si nunca reportó. */
  ultima: Lectura | null;
  ahora: number;
  borrador: Borrador;
  puedeQuitar: boolean;
  alTocar: (cambio: Partial<Borrador>) => void;
}) {
  const idMin = `umbral-${magnitud.id}-min`;
  const idMax = `umbral-${magnitud.id}-max`;

  return (
    <div className={`borne borne--ancho${borrador.quitar ? ' borne--quitado' : ''}`}>
      <span className="borne__cabeza">
        <span className="campo__etiqueta">
          {magnitud.rotulo}
          {magnitud.unidad ? <span className="umbral__unidad"> · {magnitud.unidad}</span> : null}
        </span>
        <span className="serigrafia borne__designacion" aria-hidden="true">
          {designacion}
        </span>
      </span>

      <span className="umbral">
        <span className="umbral__campo umbral__campo--angosto">
          <label className="umbral__rotulo" htmlFor={idMin}>
            Mínimo
          </label>
          <span className="hueco hueco--campo">
            <input
              id={idMin}
              name={idMin}
              type="text"
              className="campo__entrada cifra"
              inputMode="decimal"
              value={borrador.min}
              onChange={(e) => alTocar({ min: e.target.value })}
              disabled={borrador.quitar}
              autoComplete="off"
            />
          </span>
        </span>

        <span className="umbral__campo umbral__campo--angosto">
          <label className="umbral__rotulo" htmlFor={idMax}>
            Máximo
          </label>
          <span className="hueco hueco--campo">
            <input
              id={idMax}
              name={idMax}
              type="text"
              className="campo__entrada cifra"
              inputMode="decimal"
              value={borrador.max}
              onChange={(e) => alTocar({ max: e.target.value })}
              disabled={borrador.quitar}
              autoComplete="off"
            />
          </span>
        </span>

        {/* La lectura se monta como el instrumento que este mundo ya tiene
            —`lectura`, con su alojamiento rebajado y su designación arriba a la
            derecha— y no como un tercer campo. Es la única cifra medida de toda
            la pantalla: lo demás son valores que alguien tipeó. */}
        <span className={`lectura umbral__lectura${ultima ? '' : ' umbral__lectura--muda'}`}>
          <span className="serigrafia lectura__designacion" aria-hidden="true">
            {designacionLectura}
          </span>
          <span className="serigrafia lectura__etiqueta">
            {ultima ? edadTexto(ahora - Date.parse(ultima.medidoEn)) : 'Sin reportes'}
          </span>
          <span className="lectura__valor cifra">
            {ultima ? cifraTexto(ultima.valor) : '—'}
            {ultima && magnitud.unidad ? (
              <span className="lectura__unidad">{magnitud.unidad}</span>
            ) : null}
          </span>
        </span>

        {puedeQuitar ? (
          <button
            type="button"
            className="fila__accion umbral__quitar"
            aria-pressed={borrador.quitar}
            onClick={() => alTocar({ quitar: !borrador.quitar })}
          >
            {borrador.quitar ? 'Dejarla' : 'Quitar'}
            <span className="oculto-visual"> {magnitud.rotulo}</span>
          </button>
        ) : null}
      </span>

      <span className="borne__pie">
        {borrador.quitar ? (
          'Se va al guardar.'
        ) : (
          <>
            Vacío quiere decir que por ese lado no se vigila. La reporta como{' '}
            <span className="cifra">{magnitud.clave}</span>.
            {/* Cuándo se midió y cuándo llegó son dos cosas, y separarlas
                importa justo en el caso para el que se guardan las dos fechas:
                un buque que vuelve a rango sube quince días juntos, y esa
                lectura es vieja aunque haya llegado recién. Se dice sólo cuando
                las dos fechas se separaron de veras — si no, es ruido. */}
            {ultima && demorada(ultima) ? (
              <> Llegó {edadTexto(ahora - Date.parse(ultima.recibidoEn))}.</>
            ) : null}
          </>
        )}
      </span>
    </div>
  );
}

/** El mensaje que trae una respuesta que salió mal, o uno de reserva. */
async function mensajeDe(respuesta: Response, reserva: string): Promise<string> {
  const cuerpo = await respuesta.json().catch(() => null);
  return typeof cuerpo?.mensaje === 'string' ? cuerpo.mensaje : reserva;
}
