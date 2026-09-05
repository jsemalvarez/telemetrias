import type { Miembro } from '@/lib/auth/usuarios';
import { ROTULO_ROL } from '@/lib/auth/roles';
import { Interruptor } from './instrumentos';

/**
 * Padrón de personal (−A2): lo que ve el administrador de una empresa.
 *
 * Lista a los administradores y encargados de su empresa —el personal que la
 * opera— y ofrece el alta. El encargado no llega a esta pantalla: le falta el
 * permiso `personal:ver`, y ése es el corte que lo separa del admin.
 *
 * Monta el mismo panel de registro que el padrón de clientes: un registro es una
 * lectura, no una tarjeta, y cada miembro va en su propio alojamiento rebajado.
 *
 * El alta está sin tensión hasta que exista la base: la pantalla no finge un
 * alta que no puede guardar, y el pie de la chapa dice por qué.
 */
export function Personal({
  empresa,
  personal,
  puedeCrear,
}: {
  empresa: string;
  personal: Miembro[];
  puedeCrear: boolean;
}) {
  return (
    <main className="registro" id="contenido">
      <div className="marco">
        <div className="regleta registro__panel">
          <div className="regleta__chapa">
            <span className="serigrafia">−A2 · Padrón de personal</span>
          </div>

          <div className="registro__cabeza">
            <div className="registro__texto">
              <h1>Personal</h1>
              <p>
                Los administradores y encargados de {empresa}. El administrador da de alta al
                personal de su empresa; el encargado no llega a esta pantalla.
              </p>
            </div>

            {puedeCrear ? (
              <Interruptor designacion="−S6" className="registro__accion" disabled>
                Crear personal
              </Interruptor>
            ) : null}
          </div>

          <ul className="registro__lista">
            {personal.map((miembro) => (
              <li className="hueco fila" key={miembro.id}>
                <h2 className="fila__titulo">{miembro.nombre}</h2>
                <span className="fila__sub cifra">{miembro.usuario}</span>
                <span className="fila__aside">
                  {miembro.roles.map((rol) => (
                    <span className="serigrafia fila__rol" key={rol}>
                      {ROTULO_ROL[rol]}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>

          <p className="registro__nota">
            El alta queda sin tensión hasta que esté conectada la base: hoy el personal está
            sembrado en código y esta lista lo lee de ahí.
          </p>
        </div>
      </div>
    </main>
  );
}
