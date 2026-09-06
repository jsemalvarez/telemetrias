import { NextResponse } from 'next/server';
import { hashear, verificar } from '@/lib/auth/contrasena';
import { ponerSesion } from '@/lib/auth/cookies';
import { anotarFallo, frenado, limpiar, origen } from '@/lib/auth/freno';
import { CLAVE_MINIMA } from '@/lib/auth/reglas';
import { emitir, sesionActual } from '@/lib/auth/servidor';
import { cambiarClave, porId } from '@/lib/auth/usuarios';

/* scrypt es de node:crypto: este handler no corre en Edge. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cambio de la contraseña propia.
 *
 * Pide la de ahora, y no por trámite: tener la sesión abierta no es saber la
 * contraseña. Sin ese paso, un teléfono desbloqueado sobre una mesa alcanza
 * para quedarse con la cuenta.
 *
 * Guardar **cierra las demás sesiones abiertas** —`cambiarClave` sube la
 * versión de credenciales—, que es lo que hace que cambiar la contraseña sirva
 * de algo cuando se la cambia porque otro la sabe. La pantalla lo dice antes de
 * apretar, no después.
 *
 * Y cierra también la sesión desde la que se hizo el cambio, así que acá se
 * reemite. Si eso se olvidara, la persona cambia su contraseña y el sistema la
 * escupe al acceso, que es la peor manera de confirmarle que salió bien.
 *
 * Lleva freno, como el acceso: es el otro lugar del sistema donde se verifica
 * una contraseña, o sea el otro lugar donde se la puede adivinar probando.
 */

type Cuerpo = { actual?: unknown; nueva?: unknown };

const SIN_CACHE = { 'Cache-Control': 'no-store' };

function error(codigo: string, mensaje: string, estado: number) {
  return NextResponse.json(
    { ok: false, error: codigo, mensaje },
    { status: estado, headers: SIN_CACHE },
  );
}

export async function POST(pedido: Request) {
  const sesion = await sesionActual();
  if (!sesion) return error('sesion', 'No hay sesión.', 401);

  let cuerpo: Cuerpo;
  try {
    cuerpo = await pedido.json();
  } catch {
    return error('cuerpo', 'No se pudo leer el pedido.', 400);
  }

  const actual = typeof cuerpo.actual === 'string' ? cuerpo.actual : '';
  const nueva = typeof cuerpo.nueva === 'string' ? cuerpo.nueva : '';

  if (!actual || !nueva) {
    return error('faltan', 'Faltan datos: hay que completar los dos bornes.', 400);
  }
  if (nueva.length < CLAVE_MINIMA) {
    return error('clave', `La contraseña tiene que ser de ${CLAVE_MINIMA} caracteres o más.`, 400);
  }
  if (nueva === actual) {
    return error('igual', 'La contraseña nueva es la misma que tenías.', 400);
  }

  const usuario = await porId(sesion.id);
  if (!usuario || !usuario.activo) return error('sesion', 'No hay sesión.', 401);

  const llave = `${origen(pedido.headers)}|perfil|${usuario.id}`;
  const espera = frenado(llave);
  if (espera) {
    return error(
      'frenado',
      `Demasiados intentos fallidos. Probá de nuevo en ${Math.ceil(espera.segundos / 60)} min.`,
      429,
    );
  }

  if (!(await verificar(actual, usuario.hash))) {
    anotarFallo(llave);
    return error('actual', 'Esa no es tu contraseña de ahora.', 401);
  }
  limpiar(llave);

  const actualizado = await cambiarClave(usuario.id, await hashear(nueva));

  /* La versión de credenciales que acaba de subir dejó sin valor al refresco
     con el que se entró. Se emite el par nuevo y se ponen las dos cookies: sin
     esto, guardar la contraseña te deja afuera. */
  const { sesion: nueva_, acceso, refresco, vidas } = await emitir(actualizado);
  const respuesta = NextResponse.json({ ok: true, sesion: nueva_ }, { headers: SIN_CACHE });
  ponerSesion(respuesta, { acceso, refresco }, vidas);
  return respuesta;
}
