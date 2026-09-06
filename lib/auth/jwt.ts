/**
 * Emisión y verificación de los dos tokens.
 *
 * Sólo depende de `jose`, que corre con WebCrypto: este archivo también funciona
 * en el middleware (runtime Edge), donde `node:crypto` no existe.
 *
 * **Acceso** (30 min): lleva identidad, roles y cliente. Es el que se verifica
 * en cada request; que sea corto es lo que hace que un cambio de rol se aplique
 * pronto sin necesidad de una lista de revocación.
 *
 * **Refresco** (30 días): lleva sólo `sub` y la versión de credenciales. No
 * lleva roles a propósito — al refrescar se relee el usuario, así que el rol
 * que se aplica es el de ahora y no el del día que se abrió la sesión. Los 30
 * días son de oficio: el buque sale a navegar y vuelve sin conexión durante
 * semanas; una sesión de un día obligaría a entrar de nuevo justo cuando no hay
 * señal para hacerlo.
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { normalizarRoles, type Rol } from './roles';
import type { Sesion } from './sesion';

const EMISOR = 'tecvol-monitoreo';
const AUDIENCIA = 'tecvol-monitoreo';

export const VIDA_ACCESO = 30 * 60; // segundos
export const VIDA_REFRESCO = 30 * 24 * 60 * 60;

/**
 * El secreto no tiene default. Un default de desarrollo termina, tarde o
 * temprano, firmando tokens en producción; es preferible que la app no arranque.
 */
function secreto() {
  const s = process.env.AUTH_SECRETO;
  if (!s || s.length < 32) {
    throw new Error(
      'Falta AUTH_SECRETO (mínimo 32 caracteres). Generá uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
    );
  }
  return new TextEncoder().encode(s);
}

export type ClaimsAcceso = Sesion & { ver: number };

function jti() {
  return crypto.randomUUID();
}

export async function firmarAcceso(claims: ClaimsAcceso) {
  return new SignJWT({
    correo: claims.correo,
    nombre: claims.nombre,
    roles: claims.roles,
    cliente: claims.cliente,
    provisoria: claims.claveProvisoria,
    ver: claims.ver,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.id)
    .setIssuer(EMISOR)
    .setAudience(AUDIENCIA)
    .setIssuedAt()
    .setJti(jti())
    .setExpirationTime(`${VIDA_ACCESO}s`)
    .sign(secreto());
}

export async function firmarRefresco(id: string, ver: number) {
  return new SignJWT({ tipo: 'refresco', ver })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(id)
    .setIssuer(EMISOR)
    .setAudience(AUDIENCIA)
    .setIssuedAt()
    .setJti(jti())
    .setExpirationTime(`${VIDA_REFRESCO}s`)
    .sign(secreto());
}

async function abrir(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secreto(), {
      issuer: EMISOR,
      audience: AUDIENCIA,
      algorithms: ['HS256'], // sin esto, un token con alg "none" pasaría
    });
    return payload;
  } catch {
    /* Vencido, mal firmado o basura: para el que llama es todo lo mismo. */
    return null;
  }
}

/** Devuelve la sesión del token de acceso, o null si no vale. */
export async function verificarAcceso(token: string | undefined | null) {
  if (!token) return null;
  const p = await abrir(token);
  if (!p || typeof p.sub !== 'string') return null;
  if (typeof p.correo !== 'string' || typeof p.cliente !== 'string') return null;

  const roles: Rol[] = normalizarRoles(p.roles);
  const sesion: Sesion & { ver: number } = {
    id: p.sub,
    correo: p.correo,
    nombre: typeof p.nombre === 'string' ? p.nombre : p.correo,
    roles,
    cliente: p.cliente,
    /* Un token viejo sin la marca vale igual y no enciende la lámpara: el
       refresco la trae en cuanto pase, y en el peor caso son 30 minutos. */
    claveProvisoria: p.provisoria === true,
    /* El modo no viaja en el token: es una preferencia, no una credencial, y
       vive en su propia cookie. Quien arme la sesión completa lo resuelve. */
    modo: null,
    ver: typeof p.ver === 'number' ? p.ver : 0,
  };
  return sesion;
}

/** Devuelve el id de usuario del token de refresco, o null si no vale. */
export async function verificarRefresco(token: string | undefined | null) {
  if (!token) return null;
  const p = await abrir(token);
  if (!p || typeof p.sub !== 'string' || p.tipo !== 'refresco') return null;
  return { id: p.sub, ver: typeof p.ver === 'number' ? p.ver : 0 };
}
