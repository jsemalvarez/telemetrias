import { conDispositivo } from '@/lib/dispositivos/guarda';
import { darDeBaja, volverAlServicio } from '@/lib/dispositivos/padron';
import { cuerpoDe, error, listo } from '@/lib/respuestas';

/* Prisma no corre en Edge. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Poner un dispositivo fuera de servicio, o devolverlo.
 *
 * No es un `DELETE`, y el verbo importa: acá no se borra nada. La fila queda,
 * con sus magnitudes y con los umbrales que alguien se tomó el trabajo de
 * fijar, y el equipo sigue apareciendo en el padrón —abajo, en su propia
 * sección— hasta que vuelva. Un `DELETE` prometería otra cosa a quien lea esta
 * API desde afuera.
 *
 * Los dos sentidos en la misma ruta porque son el mismo acto: un equipo entra y
 * sale de servicio, que es lo que hacen los equipos. Y que la vuelta esté a un
 * clic es lo que hace que la baja no necesite una confirmación con guarda: lo
 * peligroso no es darla, es no poder deshacerla.
 */

type Cuerpo = { enServicio?: unknown };

export async function PUT(pedido: Request, { params }: { params: { id: string } }) {
  const guarda = await conDispositivo(params.id, 'dispositivo:administrar');
  if (!guarda.ok) return guarda.respuesta;

  const leido = await cuerpoDe<Cuerpo>(pedido);
  if (!leido.ok) return leido.respuesta;

  /* Se exige el booleano en vez de alternar el estado que haya. Un endpoint que
     invierte lo que encuentra hace cosas distintas según quién apretó primero,
     y dos pestañas abiertas alcanzan para que el equipo termine al revés de
     como lo dejó la última persona que miró. */
  if (typeof leido.cuerpo.enServicio !== 'boolean') {
    return error('estado', 'Hay que decir si queda en servicio o fuera de servicio.', 400);
  }

  if (leido.cuerpo.enServicio) {
    await volverAlServicio(guarda.dato.id);
  } else {
    await darDeBaja(guarda.dato.id);
  }

  return listo({ enServicio: leido.cuerpo.enServicio });
}
