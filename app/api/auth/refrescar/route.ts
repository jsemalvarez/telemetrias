import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_REFRESCO, destinoSeguro, limpiarSesion, ponerSesion } from '@/lib/auth/cookies';
import { verificarRefresco } from '@/lib/auth/jwt';
import { emitir } from '@/lib/auth/servidor';
import { porId } from '@/lib/auth/usuarios';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Renovación de la sesión.
 *
 * El refresco no lleva roles: acá se relee el usuario del padrón, así que el
 * acceso nuevo sale con los roles de ahora. Un rol retirado deja de valer en el
 * próximo refresco —30 min como mucho— sin necesidad de una lista de tokens
 * revocados.
 *
 * `ver` es el corte de emergencia: si la versión de credenciales del usuario ya
 * no coincide con la del token, el refresco no vale más. Es lo que hay que
 * mover al cambiar una contraseña o dar de baja a alguien.
 *
 * Lo que falta y hay que anotar: el refresco rota en cada uso, pero sin lugar
 * donde guardar los usados no se puede detectar que alguien reutilice uno
 * viejo. Eso llega con la base de datos.
 */
async function renovar(pedido: NextRequest) {
  const token = pedido.cookies.get(COOKIE_REFRESCO)?.value;
  const claim = await verificarRefresco(token);
  if (!claim) return null;

  const usuario = await porId(claim.id);
  if (!usuario || !usuario.activo || usuario.ver !== claim.ver) return null;

  return emitir(usuario);
}

/**
 * Rebote del middleware: se llega acá cuando el acceso venció. Es un GET porque
 * viene de una navegación, y no cambia nada del usuario — sólo renueva su
 * propia sesión y lo devuelve a donde iba.
 */
export async function GET(pedido: NextRequest) {
  const destino = destinoSeguro(pedido.nextUrl.searchParams.get('destino'));
  const renovado = await renovar(pedido);

  if (!renovado) {
    const login = new URL('/login', pedido.nextUrl);
    login.searchParams.set('destino', destino);
    const respuesta = NextResponse.redirect(login);
    limpiarSesion(respuesta);
    return respuesta;
  }

  const respuesta = NextResponse.redirect(new URL(destino, pedido.nextUrl));
  ponerSesion(respuesta, renovado, renovado.vidas);
  return respuesta;
}

/** Renovación explícita, para cuando el cliente descubre un 401 y quiere reintentar. */
export async function POST(pedido: NextRequest) {
  const cabeceras = { 'Cache-Control': 'no-store' };
  const renovado = await renovar(pedido);

  if (!renovado) {
    const respuesta = NextResponse.json({ ok: false }, { status: 401, headers: cabeceras });
    limpiarSesion(respuesta);
    return respuesta;
  }

  const respuesta = NextResponse.json({ ok: true, sesion: renovado.sesion }, { headers: cabeceras });
  ponerSesion(respuesta, renovado, renovado.vidas);
  return respuesta;
}
