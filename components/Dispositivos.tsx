import { Persianas } from './instrumentos';

/**
 * Padrón de dispositivos (−A3): lo que ve el encargado.
 *
 * Los dispositivos son los microcontroladores que el producto instala sobre el
 * equipo para que reporte, y sobre ellos el encargado fija los umbrales de
 * alerta. Todavía no hay ninguno: el monitoreo no está instalado en ningún
 * lado, así que la pantalla lo dice en vez de fabricar un inventario que no
 * existe. Es un alojamiento vacío, no un error —una bornera sin nada conectado—.
 */
export function Dispositivos({ empresa }: { empresa: string }) {
  return (
    <main className="registro" id="contenido">
      <div className="marco">
        <div className="regleta registro__panel">
          <div className="regleta__chapa">
            <span className="serigrafia">−A3 · Padrón de dispositivos</span>
          </div>

          <div className="registro__cabeza">
            <div className="registro__texto">
              <h1>Dispositivos</h1>
              <p>
                Los microcontroladores instalados en {empresa}. Sobre cada uno se fijan los
                umbrales mínimo y máximo que disparan las alertas.
              </p>
            </div>
          </div>

          <div className="registro__lista">
            <div className="hueco vacio">
              <Persianas filas={6} />
              <p className="vacio__titulo">Todavía no hay dispositivos conectados.</p>
              <p className="vacio__detalle serigrafia">
                Aparecerán acá en cuanto se instale el primero.
              </p>
            </div>
          </div>

          <p className="registro__nota">
            El alta de dispositivos queda sin tensión hasta que esté conectada la base y haya un
            equipo reportando.
          </p>
        </div>
      </div>
    </main>
  );
}
