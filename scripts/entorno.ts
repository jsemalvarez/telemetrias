/**
 * Leer una variable de entorno desde los archivos del proyecto.
 *
 * A estos scripts no los carga nadie: Next lee `.env.local` y `.env` por su
 * cuenta, y la CLI de Prisma lee `.env` por la suya, pero un `tsx scripts/…`
 * arranca con el entorno pelado del shell. Doce líneas propias antes que una
 * dependencia más.
 *
 * La precedencia es la que usa Next y la que documenta `.env.example`: lo que
 * ya está en el entorno gana —así una variable pasada en la misma invocación
 * pisa al archivo—, después `.env.local`, después `.env`. Salirse de ese orden
 * sería que un script y la aplicación lean valores distintos del mismo nombre,
 * que es la clase de diferencia que se descubre tarde y mal.
 */

import { readFileSync } from 'node:fs';

/** Los archivos, en orden de precedencia. */
const ARCHIVOS = ['.env.local', '.env'];

export function delEntorno(nombre: string): string | undefined {
  if (process.env[nombre]) return process.env[nombre];

  for (const archivo of ARCHIVOS) {
    let texto: string;
    try {
      texto = readFileSync(archivo, 'utf8');
    } catch {
      continue;
    }
    for (const linea of texto.split(/\r?\n/)) {
      const limpia = linea.trim();
      if (!limpia || limpia.startsWith('#')) continue;
      const corte = limpia.indexOf('=');
      if (corte < 0) continue;
      if (limpia.slice(0, corte).trim() !== nombre) continue;
      return limpia
        .slice(corte + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
    }
  }
  return undefined;
}
