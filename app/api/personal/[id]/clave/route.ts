import { NextResponse } from 'next/server';
import { hashear, verificar } from '@/lib/auth/contrasena';
import { anotarFallo, frenado, limpiar, origen } from '@/lib/auth/freno';
import { CLAVE_MINIMA } from '@/lib/auth/reglas';
import { ROTULO_ROL, alcanzaCliente, puede, rolesQueOtorga } from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';
import { porId, restablecerClave } from '@/lib/auth/usuarios';

/* scrypt es de node:crypto: este handler no corre en Edge. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Restablecer la contraseña de otra persona.
 *
 * Ésta es la recuperación que el producto puede dar hoy, y encaja con cómo
 * trabaja: el encargado de un buque sin señal no puede seguir un enlace que le
 * llegó por correo, pero sí puede llamar por radio a su administrador. Un
 * enlace de recuperación por correo queda para cuando haya por dónde mandarlo;
 * el correo de cada usuario ya está, así que la puerta queda abierta.
 *
 * **Quien pudo dar de alta una credencial puede reemplazarla**, y ni una más.
 * El alcance sale de `rolesQueOtorga`, la misma regla que decide el alta: un
 * administrador restablece a sus encargados, no a otro administrador ni al
 * super. Sin eso, restablecer sería el camino corto para tomar una cuenta de
 * más arriba sin necesidad de que nadie otorgue nada.
 *
 * Y pide la contraseña de quien administra, como la mudanza de correo en el
 * perfil. Restablecer no crea una credencial nueva: se mete adentro de una que
 * ya es de alguien, con su historia y su nombre. Una sesión de administrador
 * olvidada abierta no debería alcanzar para eso.
 */

type Cuerpo = { clave?: unknown; nueva?: unknown };

const SIN_CACHE = { 'Cache-Control': 'no-store' };

function error(codigo: string, mensaje: string, estado: number) {
  return NextResponse.json(
    { ok: false, error: codigo, mensaje },
    { status: estado, headers: SIN_CACHE },
  );
}

export async function POST(pedido: Request, { params }: { params: { id: string } }) {
  const sesion = await sesionActual();

  if (!sesion || !puede(sesion, 'personal:crear')) {
    return error('permiso', 'Esta sesión no puede administrar personal.', 403);
  }

  let cuerpo: Cuerpo;
  try {
    cuerpo = await pedido.json();
  } catch {
    return error('cuerpo', 'No se pudo leer el pedido.', 400);
  }

  const clave = typeof cuerpo.clave === 'string' ? cuerpo.clave : '';
  const nueva = typeof cuerpo.nueva === 'string' ? cuerpo.nueva : '';

  if (!clave || !nueva) {
    return error('faltan', 'Faltan datos: hay que completar los tres bornes.', 400);
  }
  if (nueva.length < CLAVE_MINIMA) {
    return error('clave', `La contraseña tiene que ser de ${CLAVE_MINIMA} caracteres o más.`, 400);
  }

  const objetivo = await porId(params.id);

  /* «No existe» y «no es de tu empresa» contestan lo mismo a propósito: una
     respuesta distinta convierte esta ruta en una forma de averiguar quién está
     dado de alta en el padrón de al lado. */
  if (!objetivo || !objetivo.activo || !alcanzaCliente(sesion, objetivo.cliente)) {
    return error('no-esta', 'Esa persona no está en el padrón.', 404);
  }

  if (objetivo.id === sesion.id) {
    return error(
      'propia',
      'Tu contraseña se cambia desde tu credencial, no desde acá: ahí no queda provisoria.',
      400,
    );
  }

  const otorgables = rolesQueOtorga(sesion);
  const fuera = objetivo.roles.find((rol) => !otorgables.includes(rol));
  if (!objetivo.roles.length || fuera) {
    return error(
      'alcance',
      `No podés restablecer la credencial de un ${ROTULO_ROL[fuera ?? objetivo.roles[0]].toLowerCase()}.`,
      403,
    );
  }

  /* Se verifica la contraseña de quien administra, así que acá se puede
     adivinar una probando: va el mismo freno que el acceso. La llave es la de
     quien pide, no la de quien recibe — el que se equivoca es el primero. */
  const llave = `${origen(pedido.headers)}|perfil|${sesion.id}`;
  const espera = frenado(llave);
  if (espera) {
    return error(
      'frenado',
      `Demasiados intentos fallidos. Probá de nuevo en ${Math.ceil(espera.segundos / 60)} min.`,
      429,
    );
  }

  const quienAdministra = await porId(sesion.id);
  if (!quienAdministra || !quienAdministra.activo) return error('sesion', 'No hay sesión.', 401);

  if (!(await verificar(clave, quienAdministra.hash))) {
    anotarFallo(llave);
    return error('clave', 'Esa no es tu contraseña.', 401);
  }
  limpiar(llave);

  const actualizado = await restablecerClave(objetivo.id, await hashear(nueva));

  return NextResponse.json(
    {
      ok: true,
      miembro: {
        id: actualizado.id,
        correo: actualizado.correo,
        nombre: actualizado.nombre,
        roles: actualizado.roles,
      },
    },
    { headers: SIN_CACHE },
  );
}
