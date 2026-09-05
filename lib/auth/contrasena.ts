/**
 * Hash de contraseñas con scrypt de `node:crypto`.
 *
 * scrypt está en la lista corta de OWASP y viene en Node: no hace falta
 * compilar nada ni sumar una dependencia nativa para el único lugar del sistema
 * donde se guarda un secreto de usuario. Sólo corre en runtime Node — los route
 * handlers que lo usan lo declaran.
 *
 * El formato guarda sus propios parámetros (`scrypt$N$r$p$sal$hash`), así que
 * subir el costo más adelante no invalida los hashes viejos: se verifica con
 * los parámetros con que fue creado y se puede rehashear al entrar.
 */

import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { promisify } from 'node:util';

/* promisify se queda con la sobrecarga corta de scrypt, que no recibe
   parámetros de costo. Se declara la firma que se usa. */
const scryptAsync = promisify(scrypt) as (
  clave: string,
  sal: Buffer,
  largo: number,
  opciones: ScryptOptions,
) => Promise<Buffer>;

const N = 16384;
const R = 8;
const P = 1;
const LARGO = 32;
const MAXMEM = 64 * 1024 * 1024;

/* El largo mínimo de una contraseña vive en ./reglas y no acá: también lo
   necesita la pantalla del alta, que no puede importar este módulo porque
   arrastra `node:crypto` al navegador. Se reexporta para que quien ya hashea no
   tenga que saber de dos archivos. */
export { CLAVE_MINIMA } from './reglas';

export async function hashear(clave: string) {
  const sal = randomBytes(16);
  const hash = (await scryptAsync(clave.normalize('NFKC'), sal, LARGO, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  }));
  return `scrypt$${N}$${R}$${P}$${sal.toString('base64')}$${hash.toString('base64')}`;
}

/**
 * Comparación en tiempo constante. Un `===` acá filtra, por cuánto tarda en
 * fallar, cuántos bytes del hash acertó quien está probando.
 */
export async function verificar(clave: string, guardado: string) {
  const partes = guardado.split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false;

  const n = Number(partes[1]);
  const r = Number(partes[2]);
  const p = Number(partes[3]);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  const sal = Buffer.from(partes[4], 'base64');
  const esperado = Buffer.from(partes[5], 'base64');

  try {
    const hash = (await scryptAsync(clave.normalize('NFKC'), sal, esperado.length, {
      N: n,
      r,
      p,
      maxmem: MAXMEM,
    }));
    return hash.length === esperado.length && timingSafeEqual(hash, esperado);
  } catch {
    return false;
  }
}
