'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { FLOTA_DEMO, LECTURAS } from '@/lib/datos';
import { ProveedorVivo, useVivo } from '@/lib/vivo';
import { Pluma, SimboloQ, Sinoptico, Tornillo, type Posicion } from './instrumentos';
import {
  AUXILIARES,
  CANALES,
  MUESTRAS,
  ROTULO_ESTADO,
  corteDe,
  formatear,
  fueraDeRango,
  haceTexto,
  indiceDe,
  lecturaDe,
  maniobraDe,
  marcaTexto,
  minutosDe,
  serie,
  vivoDe,
  type Canal,
} from '@/lib/registro';

/* El papel se dibuja en su propio espacio de coordenadas y se estira al ancho
   que le toque. Todo trazo lleva vector-effect para que un estirado de 3:1 no
   engorde una línea de un pixel.

   El papel de faja tiene margen impreso: la tinta corre dentro de la banda y
   las marcas de hora se imprimen en el margen de abajo. Sin ese margen, una
   lectura en el extremo de su escala se apoya contra el filo del alojamiento y
   dos canales vecinos se leen como uno solo. */
const ANCHO = 1000;
const ALTO = 100;
const MARGEN = 6;
const BANDA = ALTO - MARGEN * 2;

const px = (i: number) => (i / (MUESTRAS - 1)) * ANCHO;

/** Marcas del eje: cada seis horas, más el extremo vivo. */
const MARCAS = [
  { x: 0, rotulo: '−24 h', menor: false },
  { x: 25, rotulo: '−18 h', menor: true },
  { x: 50, rotulo: '−12 h', menor: false },
  { x: 75, rotulo: '−6 h', menor: true },
  { x: 100, rotulo: 'Ahora', menor: false },
];

/** Una muestra por hora: las marcas menores que un papel real lleva impresas. */
const HORAS = Array.from({ length: 23 }, (_, i) => (i + 1) * 6);

const ROTULO_POSICION: Record<Posicion, string> = {
  cerrado: 'Cerrado',
  abierto: 'Abierto',
  desconocido: 'Sin reporte',
};

function acotar(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Un canal de la faja: chapa de identificación, papel y ventana de lectura.
 *
 * Se monta con `display: contents` para que las tres partes caigan en las
 * columnas de la grilla del registrador — así los cuatro papeles comparten un
 * único eje de tiempo y la regla los cruza a todos por el mismo lugar.
 */
function CanalFaja({
  canal,
  puntos,
  corte,
  vivo,
  regla,
  refPapel,
}: {
  canal: Canal;
  puntos: (number | null)[];
  corte: number;
  vivo: number | null;
  regla: number | null;
  refPapel?: React.Ref<HTMLDivElement>;
}) {
  const idClip = useId().replace(/:/g, '');
  const rango = canal.max - canal.min;
  const py = (v: number) => MARGEN + BANDA - ((v - canal.min) / rango) * BANDA;

  const traza = useMemo(() => {
    let d = '';
    for (let i = 0; i < puntos.length; i += 1) {
      const p = puntos[i];
      if (p === null) break;
      d += `${d === '' ? 'M' : 'L'}${px(i).toFixed(2)} ${py(p).toFixed(2)} `;
    }
    return d.trim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puntos, canal.min, canal.max]);

  const leidos = puntos.filter((p): p is number => p !== null);
  const mostrado = regla === null ? vivo : puntos[regla];

  /* La alarma es del estado de AHORA, no de lo que la regla esté leyendo.
     Mover la regla a una hora tranquila no apaga una alarma que sigue viva. */
  const alarmaViva = fueraDeRango(canal, vivo);
  const fueraLeido = regla !== null && fueraDeRango(canal, mostrado);
  const cortado = MUESTRAS - 1 - corte >= 3;

  /* La pluma se apoya donde termina la tinta: al borde derecho si el buque
     reporta, o estacionada en el minuto del corte si el enlace se cayó. */
  const enPluma = vivo === null ? (puntos[corte] ?? canal.min) : vivo;
  const estilo = {
    '--pluma-y': acotar(py(enPluma), 0, ALTO) / ALTO,
    '--pluma-x': corte / (MUESTRAS - 1),
  } as React.CSSProperties;

  return (
    <div className={`canal${alarmaViva ? ' canal--alarma' : ''}`}>
      <div className="canal__chapa">
        <span className="canal__nombre">{canal.etiqueta}</span>
        <span className="serigrafia canal__designacion">{canal.designacion}</span>
        <span className="canal__escala cifra">
          {canal.min}–{canal.max}
          {canal.unidad && ` ${canal.unidad}`}
          {/* El umbral vive con la escala que lo contiene, no en tinta de 8 px
              sobre el papel: es el número que dice dónde salta la alarma. */}
          {canal.limite && (
            <span className="canal__umbral"> · máx {canal.limite.valor}</span>
          )}
        </span>
      </div>

      <div className="hueco canal__papel" style={estilo} ref={refPapel}>
        <svg
          className="canal__grafico"
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={
            leidos.length === 0
              ? `${canal.etiqueta}: sin registro`
              : `${canal.etiqueta}: registro de 24 horas, entre ${Math.min(...leidos).toFixed(canal.decimales)} y ${Math.max(...leidos).toFixed(canal.decimales)} ${canal.unidad}`
          }
        >
          {canal.limite && (
            <clipPath id={`sobre-${idClip}`}>
              <rect x="0" y="0" width={ANCHO} height={py(canal.limite.valor)} />
            </clipPath>
          )}

          {/* Los dos filos del margen: es lo que hace que esto sea papel de
              faja y no el mismo alojamiento que cualquier otro instrumento. */}
          <line x1="0" y1={MARGEN} x2={ANCHO} y2={MARGEN} className="canal__filo" vectorEffect="non-scaling-stroke" />
          <line
            x1="0"
            y1={ALTO - MARGEN}
            x2={ANCHO}
            y2={ALTO - MARGEN}
            className="canal__filo"
            vectorEffect="non-scaling-stroke"
          />

          {/* Cuadrícula impresa dentro de la banda */}
          {[0.25, 0.5, 0.75].map((p) => (
            <line
              key={`h${p}`}
              x1="0"
              y1={MARGEN + BANDA * p}
              x2={ANCHO}
              y2={MARGEN + BANDA * p}
              className="canal__reticula"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {[36, 72, 108].map((i) => (
            <line
              key={`v${i}`}
              x1={px(i)}
              y1={MARGEN}
              x2={px(i)}
              y2={ALTO - MARGEN}
              className="canal__reticula"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {/* Marcas de hora, impresas en el margen como en el papel real */}
          {HORAS.map((i) => (
            <line
              key={`t${i}`}
              x1={px(i)}
              y1={ALTO - MARGEN}
              x2={px(i)}
              y2={ALTO - 2}
              className="canal__hora"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Línea de máximo: rayada en el papel, como en un registrador real */}
          {canal.limite && (
            <line
              x1="0"
              y1={py(canal.limite.valor)}
              x2={ANCHO}
              y2={py(canal.limite.valor)}
              className="canal__limite"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {traza && (
            <>
              <path d={traza} className="canal__traza" vectorEffect="non-scaling-stroke" />
              {canal.limite && (
                <path
                  d={traza}
                  className="canal__traza canal__traza--alarma"
                  clipPath={`url(#sobre-${idClip})`}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </>
          )}

          {/* Donde se cortó el enlace. Lo que sigue es papel en blanco. */}
          {cortado && (
            <line
              x1={px(corte)}
              y1="0"
              x2={px(corte)}
              y2={ALTO}
              className="canal__corte"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {regla !== null && (
            <line
              x1={px(regla)}
              y1="0"
              x2={px(regla)}
              y2={ALTO}
              className="canal__regla"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        <Pluma apagada={vivo === null} />
      </div>

      <div className={`hueco canal__ventana${alarmaViva ? ' canal__ventana--alarma' : ''}`}>
        <span className={`canal__valor cifra${fueraLeido ? ' canal__valor--fuera' : ''}`}>
          {formatear(canal, mostrado)}
          {canal.unidad && <span className="canal__unidad">{canal.unidad}</span>}
        </span>
        <span className="serigrafia canal__marca">
          {regla === null ? 'Ahora' : marcaTexto(minutosDe(regla))}
        </span>
      </div>
    </div>
  );
}

/** El registrador con la flota de una empresa cargada. */
function Panel() {
  const { valores } = useVivo();
  const [elegido, setElegido] = useState(0);
  const [regla, setRegla] = useState<number | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [papel, setPapel] = useState<HTMLDivElement | null>(null);

  const buque = FLOTA_DEMO[elegido];
  const corte = corteDe(buque);
  const maniobra = maniobraDe(buque);
  const trazas = useMemo(() => CANALES.map((c) => serie(buque, c)), [buque]);
  const vivos = CANALES.map((c) => vivoDe(buque, c.id, valores));
  const tension = vivoDe(buque, 'u12', valores);

  /* Soltar contra el filo vivo devuelve la lectura a AHORA: es el gesto de
     llevar el carro al extremo del papel, no un botón escondido. */
  const posicionDe = (clientX: number) => {
    if (!papel) return null;
    const caja = papel.getBoundingClientRect();
    const f = (clientX - caja.left) / caja.width;
    if (f >= 0.995) return null;
    return Math.round(acotar(f, 0, 1) * (MUESTRAS - 1));
  };

  const alBajar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !papel) return;
    const caja = papel.getBoundingClientRect();
    if (e.clientX < caja.left || e.clientX > caja.right) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrastrando(true);
    setRegla(posicionDe(e.clientX));
  };

  const alMover = (e: React.PointerEvent<HTMLDivElement>) => {
    if (arrastrando) setRegla(posicionDe(e.clientX));
  };

  const alSoltar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastrando) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* el puntero ya se fue */
    }
    setArrastrando(false);
  };

  const teclado = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const paso = e.shiftKey ? 6 : 1;
    const actual = regla ?? MUESTRAS - 1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setRegla(Math.max(0, actual - paso));
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      const siguiente = actual + paso;
      setRegla(siguiente >= MUESTRAS - 1 ? null : siguiente);
    } else if (e.key === 'Home') setRegla(0);
    else if (e.key === 'End' || e.key === 'Escape') setRegla(null);
    else return;
    e.preventDefault();
  };

  const indiceCarro = regla ?? MUESTRAS - 1;
  const marcaRegla = regla === null ? null : marcaTexto(minutosDe(regla));
  const lecturaRegla = CANALES.map(
    (c, i) => `${formatear(c, regla === null ? vivos[i] : trazas[i][regla])}${c.unidad ? ` ${c.unidad}` : ''}`,
  ).join(', ');

  return (
    <main className="registrador" id="contenido">
      <div className="marco">
        <div className="chapa registrador__cabeza">
          <Tornillo />
          <Tornillo />
          <Tornillo />
          <Tornillo />
          <span className="serigrafia registrador__legenda">−R1 · Registrador de faja</span>
          <h1 className="registrador__titulo">
            BP <span className="registrador__nombre">&ldquo;{buque.buque}&rdquo;</span>
          </h1>
          <p className={`registrador__estado registrador__estado--${buque.estado}`}>
            <span className="registrador__lampara" aria-hidden="true" />
            <span className="registrador__palabra">{ROTULO_ESTADO[buque.estado]}</span>
            {marcaRegla ? (
              <>
                <span className="registrador__enlace">
                  <span className="registrador__regla-marca">Regla en {marcaRegla}</span>
                </span>
                <button
                  type="button"
                  className="riel__salida registrador__vivo"
                  onClick={() => setRegla(null)}
                >
                  Volver a vivo
                </button>
              </>
            ) : (
              <span className="registrador__enlace">
                Último reporte {haceTexto(buque.hace)}
              </span>
            )}
          </p>
        </div>

        <div className="registrador__cuerpo">
          <aside className="plumas">
            <div className="plumas__chapa">
              <span className="serigrafia">−S3 · Flota</span>
            </div>
            <ul className="plumas__lista">
              {FLOTA_DEMO.map((b, i) => (
                <li key={b.buque}>
                  <button
                    type="button"
                    className={`pluma pluma--${b.estado}${i === elegido ? ' pluma--cargada' : ''}`}
                    aria-pressed={i === elegido}
                    onClick={() => {
                      setElegido(i);
                      setRegla(null);
                    }}
                  >
                    <span className="pluma__lampara" aria-hidden="true" />
                    <span className="pluma__nombre">
                      BP &ldquo;{b.buque}&rdquo;
                    </span>
                    {/* Estado y edad viajan juntos: son la misma pregunta —
                        qué está haciendo y desde cuándo lo sabemos. */}
                    <span className="pluma__linea">
                      <span className="serigrafia pluma__estado">{ROTULO_ESTADO[b.estado]}</span>
                      <span className="cifra pluma__edad">{haceTexto(b.hace)}</span>
                    </span>
                    {i === elegido && <Pluma apagada={b.estado === 'sin-enlace'} />}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* La regla de lectura: se agarra el carro y se arrastra sobre la faja.
              Queda estacionada donde se suelta, y las cuatro ventanas leen ese
              mismo instante hasta que el carro vuelve al filo vivo. */}
          <div
            className="faja"
            data-arrastrando={arrastrando ? 'true' : undefined}
            onPointerDown={alBajar}
            onPointerMove={alMover}
            onPointerUp={alSoltar}
            onPointerCancel={alSoltar}
          >
            {CANALES.map((c, i) => (
              <CanalFaja
                key={c.id}
                canal={c}
                puntos={trazas[i]}
                corte={corte}
                vivo={vivos[i]}
                regla={regla}
                refPapel={i === 0 ? setPapel : undefined}
              />
            ))}

            {/* El renglón del eje se llena de punta a punta: si un tramo queda
                corto, el negro del corte deja de leerse como línea y pasa a ser
                superficie. Las dos alas dicen algo cierto del registro. */}
            <div className="eje__ala serigrafia" aria-hidden="true">
              Registro 24 h
            </div>
            <div className="eje">
              {MARCAS.map((m, i) => (
                <span
                  key={m.rotulo}
                  className={`serigrafia eje__marca${m.menor ? ' eje__marca--menor' : ''}${
                    buque.estado === 'sin-enlace' ? ' eje__marca--muerta' : ''
                  }`}
                  style={{ left: `${m.x}%` }}
                  data-extremo={i === 0 ? 'inicio' : i === MARCAS.length - 1 ? 'fin' : undefined}
                  aria-hidden="true"
                >
                  {m.rotulo}
                </span>
              ))}
              {/* El carro de la pluma: el asidero de la regla y su control de
                  teclado. Es una pieza, no un adorno — se ve dónde agarrar. */}
              <div
                className="eje__carro"
                style={
                  { '--carro-x': `${(indiceCarro / (MUESTRAS - 1)) * 100}%` } as React.CSSProperties
                }
                role="slider"
                tabIndex={0}
                aria-label="Regla de lectura"
                aria-orientation="horizontal"
                aria-valuemin={0}
                aria-valuemax={MUESTRAS - 1}
                aria-valuenow={indiceCarro}
                aria-valuetext={`${regla === null ? 'Ahora' : marcaRegla} — ${lecturaRegla}`}
                onKeyDown={teclado}
              >
                <span className="eje__carro-marca" aria-hidden="true" />
              </div>
            </div>
            <div className="eje__ala eje__ala--fin serigrafia" aria-hidden="true">
              Paso 10 min
            </div>
          </div>
        </div>

        <section className="maniobra" aria-labelledby="maniobra-t">
          <h2 className="oculto-visual" id="maniobra-t">
            Maniobra e instrumentos auxiliares
          </h2>

          <div className="maniobra__bloque">
            <div className="maniobra__chapa">
              <span className="serigrafia">−W1 · Barra principal</span>
            </div>
            <div className="hueco maniobra__hueco">
              <Sinoptico
                tension={tension === null ? '—' : `${tension.toFixed(0)} V`}
                g1={maniobra.q5}
                g2={maniobra.q6}
                puerto={maniobra.q7}
                barraViva={buque.estado !== 'sin-enlace'}
              />
            </div>
          </div>

          <div className="maniobra__bloque">
            <div className="maniobra__chapa">
              <span className="serigrafia">Interruptores · {maniobra.barra}</span>
            </div>
            <ul className="llaves">
              {(
                [
                  ['−Q5', 'Generador 1', maniobra.q5],
                  ['−Q6', 'Generador 2', maniobra.q6],
                  ['−Q7', 'Toma de puerto', maniobra.q7],
                ] as const
              ).map(([designacion, nombre, posicion]) => (
                <li className={`llave llave--${posicion}`} key={designacion}>
                  <SimboloQ estado={posicion} />
                  <span className="serigrafia llave__designacion">{designacion}</span>
                  <span className="llave__nombre">{nombre}</span>
                  <span className="llave__estado">{ROTULO_POSICION[posicion]}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="maniobra__bloque">
            <div className="maniobra__chapa">
              <span className="serigrafia">Auxiliares</span>
            </div>
            <div className="auxiliares">
              {AUXILIARES.map((a) => {
                const l = lecturaDe(a.id);
                const v = vivoDe(buque, a.id, valores);
                return (
                  <div className="lectura" key={a.id}>
                    <span className="serigrafia lectura__designacion">{a.designacion}</span>
                    <span className="serigrafia lectura__etiqueta">{l.etiqueta}</span>
                    <span className="lectura__valor cifra">
                      {v === null ? '—' : v.toFixed(l.decimales)}
                      {l.unidad && v !== null && <span className="lectura__unidad">{l.unidad}</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <p className="registrador__nota">
          Registro de demostración: trazas sintéticas y umbrales de ejemplo, a fijar con Tecvol.
          Los nombres de buque son obras reales.
        </p>
      </div>
    </main>
  );
}

/**
 * La pantalla de operación.
 *
 * La habilitación ya la resolvió el servidor: el middleware exige sesión antes
 * de que esta ruta se renderice, y la página comprueba el permiso. Acá abajo no
 * se vuelve a preguntar quién entró — si se está dibujando, corresponde.
 */
export function Registrador() {
  /* Una sola fuente de lecturas vivas, igual que en la landing: la cifra de la
     ventana y la que alimenta el sinóptico son el mismo número. */
  return (
    <ProveedorVivo>
      <Panel />
    </ProveedorVivo>
  );
}

/* Verificación de coherencia en desarrollo: si alguien agrega un canal cuyo id
   no existe en LECTURAS, es mejor enterarse acá que en una traza vacía. */
if (process.env.NODE_ENV !== 'production') {
  [...CANALES, ...AUXILIARES].forEach((c) => indiceDe(c.id));
  if (CANALES.length + AUXILIARES.length !== LECTURAS.length) {
    // eslint-disable-next-line no-console
    console.warn('El registrador no está mostrando todas las lecturas declaradas.');
  }
}
