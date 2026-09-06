import { alcanzaCliente, puede } from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';
import { panelDe } from '@/lib/telemetria/panel';
import { error, listo, texto } from '@/lib/respuestas';

/* Prisma no corre en Edge. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * El estado del panel, para que la pantalla lo vuelva a pedir.
 *
 * Es el endpoint que sostiene la actualización en vivo del Resumen. Devuelve el
 * panel entero —los equipos en servicio, sus magnitudes y la última lectura de
 * cada una— y no sólo las lecturas, a propósito: así una pantalla abierta se
 * entera de un equipo declarado hace un minuto sin que nadie recargue, y el
 * cliente reemplaza su estado de una pieza en vez de fusionar novedades sueltas.
 *
 * **Es una foto completa y por eso no hay nada que perderse.** Ésa es la
 * propiedad que lo vuelve el piso correcto para lo que venga después: cuando
 * exista un canal de empuje —Supabase Broadcast, que es lo que corresponde con
 * la aplicación en Vercel— este pedido sigue siendo el que resincroniza al
 * reconectar. Un canal que se cortó no sabe qué se perdió mientras estuvo
 * caído; esto sí, porque no cuenta novedades, cuenta el estado. En un producto
 * donde quedarse sin señal es normal, ese piso no es opcional.
 *
 * Sale de la misma función que el render del servidor, `panelDe`. Dos caminos
 * que arman la misma pantalla tienen que armarla igual, o el primer refresco se
 * ve como un parpadeo que nadie sabe explicar.
 *
 * Pide sesión y `lectura:ver` —no la clave del puente, que sólo escribe— y pasa
 * la empresa por `alcanzaCliente` como todo lo demás.
 *
 * El costo hay que tenerlo escrito: en serverless, cada pantalla abierta es una
 * invocación por cadencia de refresco. Con una demo son centavos; con veinte
 * personas mirando todo el día, es exactamente el motivo por el que después
 * viene el empuje y esta cadencia baja a la de una resincronización.
 */
export async function GET(pedido: Request) {
  const sesion = await sesionActual();
  if (!sesion || !puede(sesion, 'lectura:ver')) {
    return error('permiso', 'Esta sesión no alcanza para eso.', 403);
  }

  /* La empresa puede venir en el pedido —el super mira el panel de una que no
     es la suya— pero no se usa sin pasar por el corte. Misma regla que el alta
     de un dispositivo: el campo sólo le sirve a quien ya podía cruzar. */
  const cliente = texto(new URL(pedido.url).searchParams.get('cliente')) || sesion.cliente;
  if (!alcanzaCliente(sesion, cliente)) {
    return error('cliente', 'Esta sesión no alcanza esa empresa.', 403);
  }

  return listo({
    /* El reloj del servidor viaja con los datos: la edad de una lectura se mide
       contra él y no contra el del navegador, que puede estar corrido. */
    ahora: Date.now(),
    dispositivos: await panelDe(cliente),
  });
}
