import { alcanzaCliente, puede } from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';
import { canalDe } from '@/lib/telemetria/canal';
import { error, listo, texto } from '@/lib/respuestas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * El pase para escuchar el canal en vivo de una empresa.
 *
 * Devuelve a dónde conectarse, con qué clave publicable, a qué tópico y con qué
 * token. Nada de eso es un secreto de esta aplicación: el token vale una hora,
 * habilita **escuchar un solo tópico** y no habilita publicar en él.
 *
 * **Acá está el corte, y en un solo lugar.** Se pregunta por `lectura:ver` y se
 * pasa la empresa por `alcanzaCliente`, igual que `/api/lecturas`. Recién
 * después se firma. La política sobre `realtime.messages` que hay del lado de
 * Supabase no repite ese criterio —no sabría cómo— sino que verifica que el
 * token que llegó no se haya cambiado de tópico. Una decide, la otra comprueba.
 *
 * Contesta 503 y no 500 cuando el empuje no está configurado: no es un error,
 * es una instalación sin Supabase, y la pantalla sabe seguir andando con la
 * consulta periódica. Es la misma forma que tiene la ingesta cuando le falta la
 * clave del puente, con una diferencia importante — allá la falta de
 * configuración **cierra** la puerta, porque aceptar lecturas de cualquiera es
 * peor que no aceptar ninguna; acá sólo apaga una mejora.
 */
export async function GET(pedido: Request) {
  const sesion = await sesionActual();
  if (!sesion || !puede(sesion, 'lectura:ver')) {
    return error('permiso', 'Esta sesión no alcanza para eso.', 403);
  }

  const cliente = texto(new URL(pedido.url).searchParams.get('cliente')) || sesion.cliente;
  if (!alcanzaCliente(sesion, cliente)) {
    return error('cliente', 'Esta sesión no alcanza esa empresa.', 403);
  }

  const canal = await canalDe(cliente);
  if (!canal) {
    return error('canal', 'Esta instalación no tiene configurado el canal en vivo.', 503);
  }

  return listo({ canal });
}
