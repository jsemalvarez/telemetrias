'use client';

import { FLOTA_DEMO, ETIQUETA_DEMO } from '@/lib/datos';
import { useVivo, detalleDe } from '@/lib/vivo';
import { Bornera } from './instrumentos';

const ROTULO: Record<string, string> = {
  navegando: 'Navegando',
  alarma: 'Alarma',
  puerto: 'En puerto',
  'sin-enlace': 'Sin enlace',
};

function hace(min: number) {
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return `hace ${h} h`;
}

/**
 * La flota como panel de señalización: la misma lectura que corre en el
 * instrumento del primer viewport, ahora fila por fila.
 */
export function Flota() {
  const { valores } = useVivo();

  return (
    <section className="seccion" id="flota" aria-labelledby="flota-t">
      <div className="marco">
        <div className="seccion__cabeza">
          <h2 id="flota-t">Sin enlace no es sin problema.</h2>
          <p>
            Un buque en el banco pierde cobertura y eso es normal. Lo que no puede pasar es que
            una lectura vieja se muestre como si fuera de ahora. Cada fila dice cuándo reportó por
            última vez.
          </p>
        </div>

        <div className="panel-flota hueco">
          <div className="panel-flota__barra">
            <span className="serigrafia">−A1 · Flota · 7 cascos</span>
            <span className="serigrafia panel-flota__demo">{ETIQUETA_DEMO}</span>
          </div>
          <table className="tabla-flota">
            <caption className="oculto-visual">
              Estado de la flota con datos de demostración
            </caption>
            <thead>
              <tr>
                <th scope="col">Buque</th>
                <th scope="col">Estado</th>
                <th scope="col">Última lectura</th>
                <th scope="col">Reportó</th>
              </tr>
            </thead>
            <tbody>
              {FLOTA_DEMO.map((b) => (
                <tr key={b.buque} className={`fila fila--${b.estado}`}>
                  <th scope="row">
                    <span className="fila__piloto" aria-hidden="true" />
                    BP &ldquo;{b.buque}&rdquo;
                  </th>
                  <td>
                    <span className="fila__estado">{ROTULO[b.estado]}</span>
                  </td>
                  <td className="fila__detalle cifra">
                    {detalleDe(b.buque, b.estado, b.detalle, valores)}
                  </td>
                  <td className="fila__hace cifra">{hace(b.hace)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel-flota__bornera">
            <Bornera cantidad={24} />
          </div>
        </div>
      </div>
    </section>
  );
}
