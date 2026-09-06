import { conMagnitud } from '@/lib/dispositivos/guarda';
import { bajaMagnitud, fijarUmbral } from '@/lib/dispositivos/padron';
import { aUmbral, umbralValido } from '@/lib/dispositivos/reglas';
import { cuerpoDe, error, listo } from '@/lib/respuestas';

/* Prisma no corre en Edge. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Los dos actos que se pueden hacer sobre una magnitud ya declarada, cada uno
 * con su verbo y con su permiso.
 *
 * `PUT` fija el umbral y pide `umbral:definir`. Es el acto del encargado y el
 * único que él puede escribir en todo el padrón. Por eso no toca ninguna otra
 * columna: si de paso aceptara el rótulo o la unidad, el permiso del encargado
 * pasaría a ser el del administrador sin que nadie lo hubiera decidido.
 *
 * `DELETE` la saca del padrón y pide `dispositivo:administrar`. La fila queda
 * —el día que haya mediciones, cada una nombra la magnitud que la produjo—,
 * pero desde afuera la magnitud desapareció, y por eso acá el verbo sí es
 * `DELETE`. Un dispositivo fuera de servicio, en cambio, se sigue viendo, y por
 * eso aquél va por `PUT .../servicio` y no por acá.
 *
 * Volver a darla de alta no necesita ruta: el alta reactiva la que estaba
 * guardada bajo la misma clave, con sus umbrales.
 */

type Cuerpo = { min?: unknown; max?: unknown };

export async function PUT(
  pedido: Request,
  { params }: { params: { id: string; magnitud: string } },
) {
  const guarda = await conMagnitud(params.id, params.magnitud, 'umbral:definir');
  if (!guarda.ok) return guarda.respuesta;

  const leido = await cuerpoDe<Cuerpo>(pedido);
  if (!leido.ok) return leido.respuesta;

  const min = aUmbral(leido.cuerpo.min);
  const max = aUmbral(leido.cuerpo.max);
  if (min === undefined || max === undefined) {
    return error('umbral', 'El mínimo y el máximo tienen que ser números, o quedar vacíos.', 400);
  }

  /* Un mínimo por encima del máximo es una alerta que se dispara siempre, y una
     alerta que se dispara siempre no es una alerta. Los dos vacíos, en cambio,
     se aceptan: es la manera de decir que esta magnitud se registra y no se
     vigila. */
  if (!umbralValido(min, max)) {
    return error('umbral', 'El mínimo no puede ser mayor que el máximo.', 400);
  }

  const magnitud = await fijarUmbral(guarda.dato.id, { min, max });
  return listo({ magnitud });
}

export async function DELETE(
  _pedido: Request,
  { params }: { params: { id: string; magnitud: string } },
) {
  const guarda = await conMagnitud(params.id, params.magnitud, 'dispositivo:administrar');
  if (!guarda.ok) return guarda.respuesta;

  await bajaMagnitud(guarda.dato.id);
  return listo({ magnitud: guarda.dato.id });
}
