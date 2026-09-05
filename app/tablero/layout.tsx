import { Riel } from '@/components/secciones';
import { Salida } from '@/components/Sesion';
import { Conmutador } from '@/components/Conmutador';
import { Botonera } from '@/components/Botonera';
import { modosDisponibles } from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';
import { destinosDe } from '@/lib/navegacion';

/**
 * La cabina: el marco que comparten todas las rutas de la aplicación.
 *
 * El riel y la botonera son moldura del gabinete y viven acá, no en cada
 * pantalla: una ruta nueva se monta escribiendo su contenido y nada más. La
 * sesión se lee una sola vez por pedido —`sesionActual` la cachea— aunque el
 * layout y la pantalla la pidan por separado.
 *
 * Sin sesión no se llega hasta acá: el middleware manda al acceso antes de que
 * se renderice nada. La rama sin sesión queda igual, porque el riel no puede
 * quedarse sin salida si algún día esta ruta deja de estar protegida.
 */
export default async function CabinaLayout({ children }: { children: React.ReactNode }) {
  const sesion = await sesionActual();
  const modos = modosDisponibles(sesion?.roles ?? []);
  const destinos = destinosDe(sesion);

  return (
    <>
      <Riel
        variante="minimo"
        derecha={
          sesion ? (
            <>
              {/* Las posiciones que la llave puede tomar. Una llave de una sola
                  posición no es una llave: ahí no se monta. */}
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

      <div className={`cabina${destinos.length ? '' : ' cabina--sin-banco'}`}>
        {destinos.length ? <Botonera destinos={destinos} /> : null}
        {children}
      </div>
    </>
  );
}
