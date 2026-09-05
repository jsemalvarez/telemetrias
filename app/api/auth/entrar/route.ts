import { NextResponse } from 'next/server';
import { ponerSesion } from '@/lib/auth/cookies';
import { verificar } from '@/lib/auth/contrasena';
import { anotarFallo, frenado, limpiar, origen } from '@/lib/auth/freno';
import { emitir } from '@/lib/auth/servidor';
import { HASH_SENUELO, porUsuario } from '@/lib/auth/usuarios';

/* scrypt es de node:crypto: este handler no corre en Edge. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Cuerpo = { usuario?: unknown; clave?: unknown };

export async function POST(pedido: Request) {
  let cuerpo: Cuerpo;
  try {
    cuerpo = await pedido.json();
  } catch {
    return error('cuerpo', 'No se pudo leer el pedido.', 400);
  }

  const usuario = typeof cuerpo.usuario === 'string' ? cuerpo.usuario.trim() : '';
  const clave = typeof cuerpo.clave === 'string' ? cuerpo.clave : '';

  if (!usuario || !clave) {
    return error('faltan', 'Faltan datos: hay que completar los dos bornes.', 400);
  }

  /* Frena por dirección y usuario juntos: así una fuerza bruta contra una
     cuenta no queda tapada por el tráfico normal de la misma oficina. */
  const llave = `${origen(pedido.headers)}|${usuario.toLowerCase()}`;
  const espera = frenado(llave);
  if (espera) {
    return error(
      'frenado',
      `Demasiados intentos fallidos. Probá de nuevo en ${Math.ceil(espera.segundos / 60)} min.`,
      429,
    );
  }

  const encontrado = await porUsuario(usuario);

  /* Si el usuario no existe se verifica igual contra el señuelo. La respuesta
     tarda lo mismo, así que el tiempo no delata qué usuarios están dados de
     alta. Por lo mismo, el mensaje de error es uno solo para los dos casos. */
  const vale = await verificar(clave, encontrado?.hash ?? HASH_SENUELO);

  if (!encontrado || !encontrado.activo || !vale) {
    anotarFallo(llave);
    return error('credenciales', 'Usuario o contraseña incorrectos.', 401);
  }

  limpiar(llave);

  const { sesion, acceso, refresco, vidas } = await emitir(encontrado);
  const respuesta = NextResponse.json({ ok: true, sesion }, { headers: SIN_CACHE });
  ponerSesion(respuesta, { acceso, refresco }, vidas);
  return respuesta;
}

const SIN_CACHE = { 'Cache-Control': 'no-store' };

function error(codigo: string, mensaje: string, estado: number) {
  return NextResponse.json({ ok: false, error: codigo, mensaje }, { status: estado, headers: SIN_CACHE });
}
