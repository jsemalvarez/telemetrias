'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Sesion } from '@/lib/auth/sesion';
import { ROTULO_ROL, type Rol } from '@/lib/auth/roles';
import { Tornillo, Interruptor } from './instrumentos';

/**
 * Identificación de sesión y salida, montadas en el riel.
 *
 * La sesión llega por props desde el servidor, que ya la leyó de la cookie: no
 * hay un momento en que la pantalla no sepa quién entró, así que tampoco hay
 * parpadeo entre "cargando" y el nombre.
 */
export function Salida({ sesion }: { sesion: Sesion }) {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  const salir = async () => {
    setSaliendo(true);
    try {
      await fetch('/api/auth/salir', { method: 'POST' });
    } catch {
      /* Sin enlace no se pueden borrar las cookies del servidor, pero irse del
         tablero es lo que el usuario pidió: se va igual y la sesión muere sola
         cuando vence. */
    }
    router.replace('/login');
    router.refresh();
  };

  return (
    <>
      <span className="riel__sesion serigrafia">
        Sesión <span className="cifra">{sesion.correo}</span>
      </span>
      <button className="riel__salida" type="button" onClick={salir} disabled={saliendo}>
        {saliendo ? 'Saliendo…' : 'Salir'}
      </button>
    </>
  );
}

/**
 * La sesión existe pero no alcanza para esta pantalla.
 *
 * Entrar sin sesión ya no llega hasta acá —el middleware manda al acceso antes
 * de que se renderice nada—, así que esta pantalla quedó para dos casos, y hay
 * que distinguirlos porque la salida es distinta: la credencial no alcanza (lo
 * arregla Tecvol), o el modo de vista puesto no alcanza aunque la credencial
 * sí (lo arregla el usuario girando la llave, sin pedirle permiso a nadie).
 */
export function SinHabilitacion({
  porElModo = false,
  modoQueHabilita = null,
}: {
  porElModo?: boolean;
  /** El modo del propio usuario que sí abre esta pantalla, si hay alguno. */
  modoQueHabilita?: Rol | null;
}) {
  const router = useRouter();
  const [girando, setGirando] = useState(false);

  const volver = async () => {
    if (!modoQueHabilita) return;
    setGirando(true);
    try {
      await fetch('/api/auth/modo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol: modoQueHabilita }),
      });
    } catch {
      setGirando(false);
      return;
    }
    router.refresh();
  };

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
          {porElModo ? (
            <>
              <p>
                El modo de vista que tenés puesto no incluye las lecturas. Tu credencial sí
                las habilita: girá la llave −S1 del riel para volver a un modo que las tenga.
              </p>
              <p className="obra__nota">
                La llave sólo recorta lo que ves. Nunca habilita nada que la credencial no
                tenga.
              </p>
            </>
          ) : (
            <>
              <p>
                Tu usuario entró bien, pero no tiene habilitado el monitoreo de este equipo. El
                alcance de cada usuario lo fija Tecvol al dar de alta la credencial.
              </p>
              <p className="obra__nota">
                Si te corresponde ver esta pantalla, pedí que te amplíen la habilitación.
              </p>
            </>
          )}
          {/* Es la única acción de esta pantalla, así que lleva el pulsador del
              sistema y no el chip de utilidad del riel. Cuál es esa acción
              depende de quién puso el candado. */}
          {porElModo && modoQueHabilita ? (
            <Interruptor
              designacion="−S1"
              className="obra__volver"
              disabled={girando}
              onClick={volver}
            >
              {girando ? 'Girando…' : `Volver a ${ROTULO_ROL[modoQueHabilita]}`}
            </Interruptor>
          ) : (
            <Interruptor href="/login" designacion="−Q0" className="obra__volver">
              Ir al acceso
            </Interruptor>
          )}
        </div>
      </div>
    </main>
  );
}
