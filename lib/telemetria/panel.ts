import 'server-only';
import type { Dispositivo, Magnitud } from '../dispositivos/padron';
import { padronDe } from '../dispositivos/padron';
import { ultimaPorMagnitud, type Lectura } from './mediciones';

/**
 * El estado del panel: qué hay instalado y qué está diciendo ahora mismo.
 *
 * Es la composición que mira el Resumen, y vive acá y no adentro de la pantalla
 * por una razón concreta: **la arma el render del servidor y la vuelve a armar
 * el endpoint que la pantalla consulta cada segundo.** Escrita en dos lugares,
 * el primer dibujo y el primer refresco podrían diferir, y esa diferencia se
 * vería como un parpadeo que nadie sabría explicar.
 *
 * Sólo los equipos en servicio. Un equipo dado de baja que igual reporta se
 * sigue guardando —eso lo decide la ingesta— y se sigue viendo en el padrón,
 * abajo, con la edad de su último reporte. Pero el panel es la sala de máquinas
 * mirada de un vistazo, y ahí no va lo que alguien declaró que salió de
 * servicio: mostrarlo entre los activos sería contradecir a quien lo dio de
 * baja.
 */

/** Una magnitud con lo último que dijo. */
export type MagnitudViva = Magnitud & {
  /** `null` es que nunca reportó, y se dibuja como tal. */
  ultima: Lectura | null;
};

/** Un dispositivo del panel: el fierro y sus instrumentos. */
export type DispositivoVivo = Omit<Dispositivo, 'magnitudes'> & {
  magnitudes: MagnitudViva[];
};

/**
 * El panel de una empresa.
 *
 * Dos consultas y no una por magnitud: el padrón entero de la empresa, y un
 * `DISTINCT ON` que trae la última lectura de cada magnitud de una sola pasada.
 * Es la consulta que se va a repetir cada segundo por cada persona con la
 * pantalla abierta, así que el costo de una consulta de más se paga siempre.
 *
 * No decide quién puede verla: eso ya lo decidió quien llama, con
 * `alcanzaCliente`. Este módulo no conoce la sesión, como todos sus vecinos.
 */
export async function panelDe(cliente: string): Promise<DispositivoVivo[]> {
  const padron = await padronDe(cliente);
  const ultimas = await ultimaPorMagnitud(
    padron.enServicio.flatMap((d) => d.magnitudes.map((m) => m.id)),
  );

  return padron.enServicio.map((dispositivo) => ({
    ...dispositivo,
    magnitudes: dispositivo.magnitudes.map((magnitud) => ({
      ...magnitud,
      ultima: ultimas.get(magnitud.id) ?? null,
    })),
  }));
}
