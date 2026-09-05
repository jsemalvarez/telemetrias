import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_ACCESO, destinoSeguro } from '@/lib/auth/cookies';
import { verificarAcceso } from '@/lib/auth/jwt';

/**
 * La puerta. Corre antes que cualquier pantalla de aplicación, así que una ruta
 * protegida no llega a renderizarse sin sesión: la protección no depende de que
 * cada pantalla se acuerde de chequear.
 *
 * Verifica sólo la firma y el vencimiento del acceso, que es lo único que se
 * puede hacer en Edge —acá no hay padrón de usuarios ni base de datos—. El
 * permiso fino lo revisa cada pantalla con `conPermiso`, que sí corre en Node.
 */
export async function middleware(pedido: NextRequest) {
  const sesion = await verificarAcceso(pedido.cookies.get(COOKIE_ACCESO)?.value);
  const url = pedido.nextUrl;

  /* Ya está adentro: que el acceso no lo haga entrar dos veces. */
  if (url.pathname === '/login') {
    if (!sesion) return NextResponse.next();
    return NextResponse.redirect(new URL(destinoSeguro(url.searchParams.get('destino')), url));
  }

  if (sesion) return NextResponse.next();

  /* Sin acceso válido puede haber todavía un refresco vigente, pero esa cookie
     vive en /api/auth y desde acá no se ve. Así que el rebote va siempre a
     renovar, y es esa ruta la que manda al acceso si tampoco hay refresco. */
  const renovar = new URL('/api/auth/refrescar', url);
  renovar.searchParams.set('destino', url.pathname + url.search);
  return NextResponse.redirect(renovar);
}

export const config = {
  matcher: ['/tablero/:path*', '/login'],
};
