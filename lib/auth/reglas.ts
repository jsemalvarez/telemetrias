/**
 * Reglas de credencial que valen en los dos lados.
 *
 * Este archivo existe por una razón chica y concreta: el largo mínimo de una
 * contraseña lo tiene que saber el servidor, que lo hace cumplir, y también la
 * pantalla, que lo dice antes de que alguien tipee doce caracteres para que se
 * los rechacen después. Si viviera en `contrasena.ts` la pantalla no podría
 * leerlo —ese módulo importa `node:crypto` y no puede viajar al navegador—, y
 * la salida fácil sería escribir el número dos veces. Dos números iguales hoy
 * son dos números distintos en cuanto alguien cambie uno.
 *
 * Acá adentro no hay nada que no pueda ver el navegador: es una constante.
 */

/**
 * Largo mínimo de una contraseña, en caracteres.
 *
 * Doce y no ocho porque estas credenciales no son de un usuario cualquiera:
 * abren el padrón de una empresa o, en el caso del super, el de todas.
 */
export const CLAVE_MINIMA = 12;
