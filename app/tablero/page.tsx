import type { Metadata } from 'next';
import { Riel } from '@/components/secciones';
import { Salida, SinHabilitacion } from '@/components/Sesion';
import { Registrador } from '@/components/Registrador';
import { Conmutador } from '@/components/Conmutador';
import { modoPorDefecto, modosDisponibles, permisosDe, puede } from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';

export const metadata: Metadata = {
  title: 'Tablero — Monitoreo Tecvol',
  description: 'Registrador de faja de la flota: estado, alarmas e historia de las últimas 24 h.',
  robots: { index: false, follow: false },
};

/**
 * Ruta protegida.
 *
 * El middleware ya garantizó que hay sesión válida —sin ella no se llega hasta
 * acá—, así que lo que se decide en esta página es el permiso: quién entró
 * puede no alcanzar para ver lecturas. Se pregunta por el permiso, nunca por el
 * rol, así que sumar un rol nuevo no obliga a volver a tocar esta pantalla.
 */
export default async function TableroRuta() {
  const sesion = await sesionActual();
  const habilitado = puede(sesion, 'lectura:ver');

  /* Si el permiso está entre los de todos sus roles pero no entre los del modo
     puesto, el candado lo puso el propio usuario al girar la llave. Es la misma
     pantalla con otra salida: en un caso pide un alta, en el otro se resuelve
     solo. */
  const porElModo = !habilitado && sesion !== null && permisosDe(sesion.roles).has('lectura:ver');

  /* A qué posición volver: el modo de mayor alcance entre los roles del usuario
     que sí abren esta pantalla. */
  const modoQueHabilita = porElModo
    ? modoPorDefecto((sesion?.roles ?? []).filter((rol) => permisosDe([rol]).has('lectura:ver')))
    : null;

  /* Las posiciones que la llave puede tomar. Una llave de una sola posición no
     es una llave: ahí no se monta. */
  const modos = modosDisponibles(sesion?.roles ?? []);

  return (
    <>
      <Riel
        variante="minimo"
        derecha={
          sesion ? (
            <>
              {modos.length > 1 && sesion.modo ? (
                <Conmutador modos={modos} modo={sesion.modo} />
              ) : null}
              <Salida sesion={sesion} />
            </>
          ) : (
            <a className="riel__salida" href="/login">
              Ir al acceso
            </a>
          )
        }
      />
      {habilitado ? (
        <Registrador />
      ) : (
        <SinHabilitacion porElModo={porElModo} modoQueHabilita={modoQueHabilita} />
      )}
    </>
  );
}
