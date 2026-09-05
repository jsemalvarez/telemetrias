import { NextResponse } from 'next/server';
import { ponerModo } from '@/lib/auth/cookies';
import { esRol, modosDisponibles, permisosEfectivos } from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cambiar el modo de vista.
 *
 * El modo elegido tiene que ser uno de los roles del usuario. No es una
 * verificación defensiva de trámite: es lo único que separa un conmutador de
 * vista de una escalada de privilegios. Como además el modo sólo puede
 * recortar el alcance, ni siquiera un modo aceptado agrega nada.
 */
export async function POST(pedido: Request) {
  const cabeceras = { 'Cache-Control': 'no-store' };
  const sesion = await sesionActual();
  if (!sesion) return NextResponse.json({ ok: false }, { status: 401, headers: cabeceras });

  let cuerpo: { rol?: unknown };
  try {
    cuerpo = await pedido.json();
  } catch {
    return NextResponse.json(
      { ok: false, mensaje: 'No se pudo leer el pedido.' },
      { status: 400, headers: cabeceras },
    );
  }

  const rol = cuerpo.rol;
  if (!esRol(rol) || !modosDisponibles(sesion.roles).includes(rol)) {
    return NextResponse.json(
      { ok: false, mensaje: 'Ese modo no corresponde a la credencial.' },
      { status: 400, headers: cabeceras },
    );
  }

  const respuesta = NextResponse.json(
    {
      ok: true,
      modo: rol,
      permisos: Array.from(permisosEfectivos({ roles: sesion.roles, modo: rol })).sort(),
    },
    { headers: cabeceras },
  );
  ponerModo(respuesta, rol);
  return respuesta;
}
