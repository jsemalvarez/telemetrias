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
 * Con el correo pasa lo mismo y por eso también vive acá: quien da de alta
 * necesita saber si lo que escribió es una dirección antes de apretar, y el
 * servidor lo tiene que volver a decidir por su cuenta.
 *
 * Acá adentro no hay nada que no pueda ver el navegador: una constante y dos
 * funciones puras.
 */

/**
 * Largo mínimo de una contraseña, en caracteres.
 *
 * Doce y no ocho porque estas credenciales no son de un usuario cualquiera:
 * abren el padrón de una empresa o, en el caso del super, el de todas.
 */
export const CLAVE_MINIMA = 12;

/**
 * La normalización de una dirección: sin espacios de sobra y en minúsculas.
 *
 * Pasa por acá **quien escribe y quien busca**, sin excepción. Si normalizara
 * sólo la búsqueda, se daría de alta «Ana@X.com» y después nadie entraría
 * tipeando «ana@x.com»; si normalizara sólo el alta, el índice único dejaría
 * entrar dos filas para el mismo buzón.
 *
 * Bajar todo a minúsculas no es del todo fiel al estándar —la parte de antes de
 * la arroba es, en teoría, sensible a mayúsculas—, pero no hay proveedor de
 * correo que la trate así, y la alternativa es que dos escrituras de la misma
 * casilla sean dos personas distintas del sistema. Entre la teoría y el padrón
 * duplicado, gana el padrón.
 */
export function normalizarCorreo(valor: string): string {
  return valor.trim().toLowerCase();
}

/**
 * ¿Esto tiene forma de dirección de correo?
 *
 * Deliberadamente flaco: algo antes de la arroba, algo después, un punto y un
 * dominio de dos letras para arriba, sin espacios en ningún lado. La expresión
 * que cubre el estándar entero ocupa media pantalla, rechaza direcciones
 * válidas que la gente usa todos los días y **igual** no contesta lo único que
 * importa —si la casilla existe—, que sólo lo dice mandar un correo.
 *
 * Lo que este chequeo sí evita es el error de tipeo que deja a alguien sin
 * poder entrar el día que lo necesita: una dirección sin arroba, o con un
 * espacio que le pegó el autocompletado del teléfono.
 */
export function esCorreo(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizarCorreo(valor));
}
