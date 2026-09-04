'use client';

import { useInstalacion } from '@/lib/instalacion';
import { Interruptor, Tornillo } from './instrumentos';

/**
 * Convite de instalación.
 *
 * Es una chapa atornillada que sube desde el borde inferior, no una tarjeta
 * flotante: el mundo no tiene sombras difusas, tiene biseles. Aparece a los
 * tres segundos, se descarta por siete días y no vuelve a molestar una vez que
 * la app está instalada.
 */

function SimboloBajar() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        d="M8 1.5v9m0 0L4.5 7M8 10.5 11.5 7M2 13.5h12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
      />
    </svg>
  );
}

function SimboloCompartir() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
      <path
        d="M8 10.5V1.5m0 0L5 4.5M8 1.5l3 3M3.5 7.5v7h9v-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

function SimboloAgregar() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
      <path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
    </svg>
  );
}

function SimboloListo() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
      <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
    </svg>
  );
}

/** Chapa de identificación: el ícono de la app y su rótulo. */
function Identificacion() {
  return (
    <div className="convite__marca">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="convite__icono" src="/icons/android-chrome-192x192.png" alt="" width={44} height={44} />
      <div>
        <p className="convite__nombre">Monitoreo Tecvol</p>
        <p className="convite__linea serigrafia">Pantalla de inicio</p>
      </div>
    </div>
  );
}

/** Chrome: el botón abre el diálogo de instalación nativo. */
function ChapaInstalar({ onInstalar, onDescartar }: { onInstalar: () => void; onDescartar: () => void }) {
  return (
    <div className="convite" role="dialog" aria-labelledby="convite-titulo">
      <Tornillo />
      <Tornillo />
      <div className="convite__cuerpo">
        <div className="convite__cabeza">
          <Identificacion />
          <button className="convite__cerrar" type="button" onClick={onDescartar} aria-label="Cerrar el convite">
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <p id="convite-titulo" className="convite__texto">
          Instalada, abre en pantalla propia y sin barra de navegador, y levanta
          aunque la conexión esté caída.
        </p>

        <div className="convite__mandos">
          <button className="convite__ahora-no" type="button" onClick={onDescartar}>
            Ahora no
          </button>
          <Interruptor designacion="−S9" icono={<SimboloBajar />} onClick={onInstalar}>
            Instalar
          </Interruptor>
        </div>
      </div>
    </div>
  );
}

/** Safari en iOS: no hay API de instalación, sólo el camino a mano. */
function ChapaIOS({ onDescartar }: { onDescartar: () => void }) {
  const pasos = [
    { n: '01', icono: <SimboloCompartir />, texto: <>Tocá <strong>Compartir</strong> en la barra de Safari.</> },
    { n: '02', icono: <SimboloAgregar />, texto: <>Elegí <strong>Agregar a pantalla de inicio</strong>.</> },
    { n: '03', icono: <SimboloListo />, texto: <>Confirmá con <strong>Agregar</strong>.</> },
  ];

  return (
    <>
      <div className="convite__fondo" onClick={onDescartar} aria-hidden="true" />
      <div className="convite convite--ios" role="dialog" aria-labelledby="convite-titulo">
        <Tornillo />
        <Tornillo />
        <div className="convite__cuerpo">
          <div className="convite__cabeza">
            <Identificacion />
            <button className="convite__cerrar" type="button" onClick={onDescartar} aria-label="Cerrar el convite">
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          <p id="convite-titulo" className="convite__texto">Tres pasos, una sola vez.</p>

          <ol className="convite__pasos">
            {pasos.map((paso) => (
              <li key={paso.n} className="convite__paso">
                <span className="convite__num serigrafia">{paso.n}</span>
                <span className="convite__simbolo" aria-hidden="true">{paso.icono}</span>
                <span className="convite__paso-texto">{paso.texto}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}

export function Instalar() {
  const { sePuedeInstalar, esIOS, yaInstalada, mostrar, instalar, descartar } = useInstalacion();

  if (yaInstalada || !mostrar) return null;
  if (sePuedeInstalar) return <ChapaInstalar onInstalar={instalar} onDescartar={descartar} />;
  if (esIOS) return <ChapaIOS onDescartar={descartar} />;
  return null;
}
