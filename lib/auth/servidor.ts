import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { COOKIE_ACCESO, COOKIE_MODO } from './cookies';
import { firmarAcceso, firmarRefresco, verificarAcceso, VIDA_ACCESO, VIDA_REFRESCO } from './jwt';
import { modoPorDefecto, modoValido, puede, type Permiso } from './roles';
import type { Sesion } from './sesion';
import type { Usuario } from './usuarios';

/**
 * La sesión del lado del servidor.
 *
 * `cache` de React la resuelve una sola vez por request aunque la pidan tres
 * componentes distintos: verificar la firma es barato, pero no gratis, y sobre
 * todo así todos ven exactamente la misma sesión dentro de una misma pantalla.
 */
export const sesionActual = cache(async (): Promise<Sesion | null> => {
  const almacen = cookies();
  const claims = await verificarAcceso(almacen.get(COOKIE_ACCESO)?.value);
  if (!claims) return null;
  const { ver: _ver, ...sesion } = claims;

  /* El modo llega de una cookie, o sea de afuera: se valida contra los roles
     del token antes de tocar nada. Un modo que no le corresponde cae al de por
     defecto en vez de fallar — no hay nada que proteger, porque un modo no
     puede dar permisos, sólo sacarlos. */
  return { ...sesion, modo: modoValido(sesion.roles, almacen.get(COOKIE_MODO)?.value) };
});

/**
 * Para las pantallas: devuelve la sesión sólo si además alcanza el permiso.
 * `null` puede significar dos cosas distintas —sin sesión o sin permiso— y las
 * dos terminan en la misma pantalla, así que no hace falta distinguirlas.
 */
export async function conPermiso(permiso: Permiso): Promise<Sesion | null> {
  const sesion = await sesionActual();
  return sesion && puede(sesion, permiso) ? sesion : null;
}

/** Lo que del usuario puede viajar al cliente. El hash nunca sale de acá. */
export function sesionDe(usuario: Usuario): Sesion {
  return {
    id: usuario.id,
    usuario: usuario.usuario,
    nombre: usuario.nombre,
    roles: usuario.roles,
    cliente: usuario.cliente,
    modo: modoPorDefecto(usuario.roles),
  };
}

/** Firma el par de tokens de un usuario. Quién los guarda lo decide el handler. */
export async function emitir(usuario: Usuario) {
  const sesion = sesionDe(usuario);
  const [acceso, refresco] = await Promise.all([
    firmarAcceso({ ...sesion, ver: usuario.ver }),
    firmarRefresco(usuario.id, usuario.ver),
  ]);
  return { sesion, acceso, refresco, vidas: { acceso: VIDA_ACCESO, refresco: VIDA_REFRESCO } };
}
