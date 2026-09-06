import 'server-only';
import { NextResponse } from 'next/server';

/**
 * La forma de las respuestas de la API.
 *
 * Los tres handlers anteriores —clientes, personal, perfil— llevan cada uno su
 * propia copia de estas quince líneas, y con tres estaba bien. El padrón de
 * dispositivos entra con cuatro rutas más, y siete copias de la misma función
 * de error son siete lugares donde el día de mañana un mensaje sale con otra
 * forma y la pantalla no lo sabe leer.
 *
 * Los que ya estaban no se migran acá en el mismo movimiento: son código
 * terminado y probado a mano, y esto no cambia nada de lo que hacen. Se mudan
 * la próxima vez que haya que tocarlos por otra razón.
 */

/** Ninguna respuesta de la API se guarda: todas hablan de una sesión. */
export const SIN_CACHE = { 'Cache-Control': 'no-store' };

/**
 * Un error con código y mensaje.
 *
 * El código es para el programa y el mensaje es para la persona: la pantalla
 * muestra el mensaje tal cual, así que está escrito en el idioma del producto
 * y dice qué hacer, no qué falló.
 */
export function error(codigo: string, mensaje: string, estado: number) {
  return NextResponse.json(
    { ok: false, error: codigo, mensaje },
    { status: estado, headers: SIN_CACHE },
  );
}

/** Una respuesta buena, con lo que haya que devolver. */
export function listo<T extends object>(datos: T) {
  return NextResponse.json({ ok: true, ...datos }, { headers: SIN_CACHE });
}

/** Lo que llegó del navegador, si es texto; si no, vacío. */
export const texto = (valor: unknown) => (typeof valor === 'string' ? valor.trim() : '');

/** Lo mismo, pero un campo opcional vacío es la ausencia y no la cadena vacía. */
export const textoOpcional = (valor: unknown) => texto(valor) || null;

/** El cuerpo del pedido, o el error de que no se pudo leer. */
export async function cuerpoDe<T>(pedido: Request): Promise<{ ok: true; cuerpo: T } | { ok: false; respuesta: NextResponse }> {
  try {
    return { ok: true, cuerpo: (await pedido.json()) as T };
  } catch {
    return { ok: false, respuesta: error('cuerpo', 'No se pudo leer el pedido.', 400) };
  }
}
