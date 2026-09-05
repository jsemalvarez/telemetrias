/**
 * Las dos cookies de sesión.
 *
 * Van `httpOnly`: el token no se guarda en `localStorage` ni pasa por JavaScript.
 * Esto es una PWA que se instala en el teléfono de a bordo; un token legible
 * desde JS lo levanta cualquier XSS y no hay forma de retirarlo después.
 *
 * `sameSite: 'lax'` es lo que protege los POST de `/api/auth/*` contra CSRF:
 * las cookies no viajan en un POST originado en otro sitio.
 *
 * La cookie de refresco vive en `/api/auth` a propósito: sólo se manda cuando
 * hay que renovar, no en cada carga de página. Por eso el middleware no puede
 * verla, y por eso manda a renovar en vez de decidir él si hay refresco.
 */

import type { NextResponse } from 'next/server';

export const COOKIE_ACCESO = 'tecvol_acceso';
export const COOKIE_REFRESCO = 'tecvol_refresco';
export const RUTA_REFRESCO = '/api/auth';

/**
 * El modo de vista activo. Va aparte de los tokens porque no es una credencial:
 * es una preferencia que sólo puede recortar lo que el usuario ya podía hacer,
 * y se valida contra sus roles en cada lectura. Por eso sobrevive a la
 * renovación de la sesión sin tener que reemitir nada.
 */
export const COOKIE_MODO = 'tecvol_modo';
const VIDA_MODO = 365 * 24 * 60 * 60;

const seguro = process.env.NODE_ENV === 'production';

function base(path: string, maxAge?: number) {
  return { httpOnly: true, secure: seguro, sameSite: 'lax' as const, path, maxAge };
}

/**
 * Las cookies de una respuesta. El tipo sale de `NextResponse` en vez de
 * escribirse a mano, así el mismo helper sirve en el route handler y en el
 * middleware, que devuelven las dos la misma clase de respuesta.
 */
type ConCookies = { cookies: NextResponse['cookies'] };

export function ponerSesion(
  respuesta: ConCookies,
  tokens: { acceso: string; refresco: string },
  vidas: { acceso: number; refresco: number },
) {
  respuesta.cookies.set(COOKIE_ACCESO, tokens.acceso, base('/', vidas.acceso));
  respuesta.cookies.set(COOKIE_REFRESCO, tokens.refresco, base(RUTA_REFRESCO, vidas.refresco));
}

export function ponerModo(respuesta: ConCookies, rol: string) {
  respuesta.cookies.set(COOKIE_MODO, rol, base('/', VIDA_MODO));
}

export function limpiarSesion(respuesta: ConCookies) {
  respuesta.cookies.set(COOKIE_MODO, '', base('/', 0));
  respuesta.cookies.set(COOKIE_ACCESO, '', base('/', 0));
  respuesta.cookies.set(COOKIE_REFRESCO, '', base(RUTA_REFRESCO, 0));
}

/**
 * Una ruta interna a la que es seguro volver después de entrar.
 *
 * Sin esto, `?destino=https://otro.sitio` convierte al acceso en un redirector
 * abierto, y `?destino=/login` en un rebote infinito. El patrón exige una sola
 * barra inicial: `//otro.sitio` y `/\otro.sitio` los toma el navegador como
 * host, no como ruta.
 */
export function destinoSeguro(valor: string | null | undefined, porDefecto = '/tablero') {
  if (!valor) return porDefecto;
  if (!/^\/(?![/\\])/.test(valor)) return porDefecto;
  if (valor === '/login' || valor.startsWith('/login?') || valor.startsWith('/api/auth')) {
    return porDefecto;
  }
  return valor;
}
