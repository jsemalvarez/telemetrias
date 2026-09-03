'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tornillo, Interruptor } from './instrumentos';

const LLAVE = 'tecvol:demo';

export function leerSesion() {
  try {
    return sessionStorage.getItem(LLAVE);
  } catch {
    return null;
  }
}

/** Identificación de sesión y salida, montadas en el riel. */
export function Salida() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<string | null>(null);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setUsuario(leerSesion());
    setMontado(true);
  }, []);

  if (!montado || !usuario) return null;

  return (
    <>
      <span className="riel__sesion serigrafia">
        Sesión <span className="cifra">{usuario}</span>
      </span>
      <button
        className="riel__salida"
        type="button"
        onClick={() => {
          try {
            sessionStorage.removeItem(LLAVE);
          } catch {
            /* nada que limpiar */
          }
          router.push('/login');
        }}
      >
        Salir
      </button>
    </>
  );
}

/** La habilitación se lee en el cliente; mientras tanto no se finge un tablero. */
export function Cargando() {
  return (
    <main className="obra" id="contenido">
      <div className="marco obra__marco">
        <p className="obra__cargando serigrafia">Leyendo habilitación…</p>
      </div>
    </main>
  );
}

/** Se llegó a una ruta de aplicación sin pasar por el acceso. */
export function SinHabilitacion() {
  return (
    <main className="obra" id="contenido">
      <div className="marco obra__marco">
        <div className="chapa obra__chapa obra__chapa--sin">
          <Tornillo />
          <Tornillo />
          <Tornillo />
          <Tornillo />
          {/* La designación va arriba a la derecha del alojamiento, como todo
              instrumento del sistema. Apilada sobre el titular sería un kicker. */}
          <span className="serigrafia obra__legenda">−Q0 · Sin habilitación</span>
          <h1>Este tablero está sin tensión.</h1>
          <p>
            Llegaste acá sin pasar por el acceso, así que no hay sesión abierta. Cerrá la
            habilitación desde la pantalla de entrada.
          </p>
          <p className="obra__nota">
            Nada de este acceso es autenticación real: es una compuerta de demostración.
          </p>
          {/* Es la única acción de esta pantalla, así que lleva el pulsador del
              sistema y no el chip de utilidad del riel. */}
          <Interruptor href="/login" designacion="−Q0" className="obra__volver">
            Ir al acceso
          </Interruptor>
        </div>
      </div>
    </main>
  );
}
