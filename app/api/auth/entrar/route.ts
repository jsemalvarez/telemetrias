import { NextResponse } from 'next/server';
import { ponerSesion } from '@/lib/auth/cookies';
import { verificar } from '@/lib/auth/contrasena';
import { anotarFallo, frenado, limpiar, origen } from '@/lib/auth/freno';
import { normalizarCorreo } from '@/lib/auth/reglas';
import { emitir } from '@/lib/auth/servidor';
import { HASH_SENUELO, porCorreo } from '@/lib/auth/usuarios';

/* scrypt es de node:crypto: este handler no corre en Edge. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Cuerpo = { correo?: unknown; clave?: unknown };

export async function POST(pedido: Request) {
  let cuerpo: Cuerpo;
  try {
    cuerpo = await pedido.json();
  } catch {
    return error('cuerpo', 'No se pudo leer el pedido.', 400);
  }

  /* Se normaliza igual que al dar de alta —de eso se ocupa `normalizarCorreo`—
     y no se valida la forma: acá no corresponde. Decirle a alguien que «eso no
     es un correo» es contestar una pregunta distinta de la que hizo, y de paso
     separa el tipeo mal hecho del que no existe. Lo que no está en el padrón
     falla igual que la contraseña errada, con el mismo mensaje. */
  const correo = normalizarCorreo(typeof cuerpo.correo === 'string' ? cuerpo.correo : '');
  const clave = typeof cuerpo.clave === 'string' ? cuerpo.clave : '';

  if (!correo || !clave) {
    return error('faltan', 'Faltan datos: hay que completar los dos bornes.', 400);
  }

  /* Frena por dirección de red y cuenta juntas: así una fuerza bruta contra una
     cuenta no queda tapada por el tráfico normal de la misma oficina. */
  const llave = `${origen(pedido.headers)}|${correo}`;
  const espera = frenado(llave);
  if (espera) {
    return error(
      'frenado',
      `Demasiados intentos fallidos. Probá de nuevo en ${Math.ceil(espera.segundos / 60)} min.`,
      429,
    );
  }

  const encontrado = await porCorreo(correo);

  /* Si la cuenta no existe se verifica igual contra el señuelo. La respuesta
     tarda lo mismo, así que el tiempo no delata qué direcciones están dadas de
     alta. Por lo mismo, el mensaje de error es uno solo para los dos casos. */
  const vale = await verificar(clave, encontrado?.hash ?? HASH_SENUELO);

  if (!encontrado || !encontrado.activo || !vale) {
    anotarFallo(llave);
    return error('credenciales', 'Correo o contraseña incorrectos.', 401);
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
