import { NextResponse } from 'next/server';
import { limpiarSesion } from '@/lib/auth/cookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Salir borra las dos cookies. Con tokens firmados y sin lista de revocación,
 * un acceso ya emitido sigue siendo válido hasta que vence (30 min): por eso el
 * acceso es corto. Para cortar una sesión de inmediato —una credencial
 * comprometida— hay que subir `ver` del usuario, que invalida el refresco.
 */
export async function POST() {
  const respuesta = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  limpiarSesion(respuesta);
  return respuesta;
}
