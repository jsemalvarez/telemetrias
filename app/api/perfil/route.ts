import { NextResponse } from 'next/server';
import { verificar } from '@/lib/auth/contrasena';
import { ponerSesion } from '@/lib/auth/cookies';
import { anotarFallo, frenado, limpiar, origen } from '@/lib/auth/freno';
import { esCorreo, normalizarCorreo } from '@/lib/auth/reglas';
import { emitir, sesionActual } from '@/lib/auth/servidor';
import { cambiarDatos, duenoDelCorreo, porId } from '@/lib/auth/usuarios';

/* scrypt es de node:crypto: este handler no corre en Edge. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Los datos propios: el nombre y la dirección.
 *
 * Sólo sobre uno mismo — `sesion.id` y nada que llegue del navegador. Y sólo
 * sobre lo que es de uno: el rol y la empresa no están acá porque no los fija
 * la persona, los fija quien la administra.
 *
 * **Cambiar el correo es cambiar con qué se entra**, así que pide la contraseña
 * actual. No es ceremonia: sin eso, una sesión robada se muda la cuenta a una
 * dirección del ladrón y el dueño se queda afuera sin haber tocado nada.
 * Cambiar sólo el nombre no la pide — un nombre de pantalla no abre ninguna
 * puerta.
 *
 * Donde se verifica una contraseña hay un freno, y por eso hay uno acá: tener
 * la sesión abierta no es saber la contraseña, y sin freno esto es un lugar
 * donde probarla de a mil.
 */

type Cuerpo = { nombre?: unknown; correo?: unknown; clave?: unknown };

const SIN_CACHE = { 'Cache-Control': 'no-store' };

function error(codigo: string, mensaje: string, estado: number) {
  return NextResponse.json(
    { ok: false, error: codigo, mensaje },
    { status: estado, headers: SIN_CACHE },
  );
}

const texto = (valor: unknown) => (typeof valor === 'string' ? valor.trim() : '');

export async function POST(pedido: Request) {
  const sesion = await sesionActual();
  if (!sesion) return error('sesion', 'No hay sesión.', 401);

  let cuerpo: Cuerpo;
  try {
    cuerpo = await pedido.json();
  } catch {
    return error('cuerpo', 'No se pudo leer el pedido.', 400);
  }

  const nombre = texto(cuerpo.nombre);
  const correo = normalizarCorreo(texto(cuerpo.correo));
  const clave = typeof cuerpo.clave === 'string' ? cuerpo.clave : '';

  if (!nombre || !correo) {
    return error('faltan', 'Ni el nombre ni el correo pueden quedar vacíos.', 400);
  }
  if (!esCorreo(correo)) {
    return error('correo', 'Eso no es una dirección de correo.', 400);
  }

  /* Se relee de la base y no se confía en el token: el hash no viaja en la
     sesión, y el correo que lleva puede tener hasta 30 minutos. */
  const usuario = await porId(sesion.id);
  if (!usuario || !usuario.activo) return error('sesion', 'No hay sesión.', 401);

  if (correo !== usuario.correo) {
    const llave = `${origen(pedido.headers)}|perfil|${usuario.id}`;
    const espera = frenado(llave);
    if (espera) {
      return error(
        'frenado',
        `Demasiados intentos fallidos. Probá de nuevo en ${Math.ceil(espera.segundos / 60)} min.`,
        429,
      );
    }

    if (!clave) {
      return error('clave', 'Para cambiar el correo hay que confirmar con la contraseña.', 400);
    }
    if (!(await verificar(clave, usuario.hash))) {
      anotarFallo(llave);
      return error('clave', 'Esa no es tu contraseña.', 401);
    }
    limpiar(llave);

    /* Sólo puede chocar contra otra persona: si la dirección fuera la suya, no
       estaríamos adentro de esta rama. Y el mensaje se queda corto — quien
       pregunta no cruza el corte entre empresas. */
    if (await duenoDelCorreo(correo)) {
      return error('correo-repetido', 'Ese correo ya está tomado.', 409);
    }
  }

  const actualizado = await cambiarDatos(usuario.id, { nombre, correo });

  /* La sesión lleva el nombre y el correo para mostrarlos, así que quedó vieja
     en el mismo momento en que se guardó. Se reemite acá y no se espera al
     refresco: si no, el riel sigue diciendo la dirección anterior media hora. */
  const { sesion: nueva, acceso, refresco, vidas } = await emitir(actualizado);
  const respuesta = NextResponse.json({ ok: true, sesion: nueva }, { headers: SIN_CACHE });
  ponerSesion(respuesta, { acceso, refresco }, vidas);
  return respuesta;
}
