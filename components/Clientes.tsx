import type { Cliente } from '@/lib/auth/usuarios';
import { Interruptor } from './instrumentos';

/**
 * Padrón de clientes (−A0): el resumen del super administrador.
 *
 * Es la única pantalla del sistema que cruza el corte entre empresas, así que
 * dice cuál es ese corte en vez de dar por sabido que quien la mira sabe lo que
 * está viendo. Cada cliente va en su propio alojamiento rebajado —un registro
 * es una lectura del padrón, no una tarjeta— con el identificador que viaja en
 * el token de sus sesiones.
 *
 * Usa el panel de registro (`registro`, `fila`) que comparten los tres listados
 * del panel: no re-dibuja un panel propio, monta el que este mundo ya tiene.
 *
 * El alta existe como pulsador y está sin tensión: no hay base todavía, y una
 * pantalla de este mundo no finge un alta que no puede guardar. La lámpara
 * apagada es exactamente eso, y el pie de la chapa dice por qué.
 */
export function Clientes({ clientes, puedeCrear }: { clientes: Cliente[]; puedeCrear: boolean }) {
  return (
    <main className="registro" id="contenido">
      <div className="marco">
        <div className="regleta registro__panel">
          <div className="regleta__chapa">
            <span className="serigrafia">−A0 · Padrón de clientes</span>
          </div>

          <div className="registro__cabeza">
            <div className="registro__texto">
              <h1>Clientes</h1>
              <p>
                Las empresas dadas de alta en el sistema. Cada una ve solamente su propio
                equipamiento; ésta es la única pantalla que cruza ese corte.
              </p>
            </div>

            {puedeCrear ? (
              <Interruptor designacion="−S5" className="registro__accion" disabled>
                Crear cliente
              </Interruptor>
            ) : null}
          </div>

          <ul className="registro__lista">
            {clientes.map((cliente) => (
              <li className="hueco fila" key={cliente.id}>
                <h2 className="fila__titulo">{cliente.rotulo}</h2>
                <span className="fila__sub cifra">{cliente.id}</span>
                <span className="fila__aside fila__cuenta">
                  <span className="cifra fila__numero">{cliente.usuarios}</span>
                  <span className="serigrafia">{cliente.usuarios === 1 ? 'usuario' : 'usuarios'}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="registro__nota">
            El alta queda sin tensión hasta que esté conectada la base: hoy el padrón está sembrado
            en código y esta lista lo lee de ahí.
          </p>
        </div>
      </div>
    </main>
  );
}
