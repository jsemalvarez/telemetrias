import { NextResponse } from 'next/server';
import { permisosDe, permisosEfectivos } from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Quién soy y qué puedo.
 *
 * Devuelve los permisos ya resueltos y no la lista de roles a secas: el
 * cliente tiene que poder decidir si muestra algo sin reimplementar la tabla
 * de roles, que es justo lo que haría que un rol nuevo obligue a tocar el
 * front.
 *
 * `permisos` son los que rigen con el modo puesto; `permisosTotales`, los de
 * todos sus roles juntos. La diferencia entre los dos es lo que el usuario
 * recupera cambiando de modo, y es lo que hace visible que un modo restringe.
 */
export async function GET() {
  const cabeceras = { 'Cache-Control': 'no-store' };
  const sesion = await sesionActual();
  if (!sesion) return NextResponse.json({ ok: false }, { status: 401, headers: cabeceras });

  return NextResponse.json(
    {
      ok: true,
      sesion,
      permisos: Array.from(permisosEfectivos(sesion)).sort(),
      permisosTotales: Array.from(permisosDe(sesion.roles)).sort(),
    },
    { headers: cabeceras },
  );
}
