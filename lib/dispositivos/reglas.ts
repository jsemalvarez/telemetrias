/**
 * Reglas del padrón de dispositivos que valen en los dos lados.
 *
 * Existe por la misma razón que `lib/auth/reglas.ts`: el servidor las hace
 * cumplir y la pantalla las dice antes de que alguien mande un pedido que va a
 * volver rechazado. Escribir el mismo largo o la misma normalización dos veces
 * es tener dos números iguales hoy y dos distintos en cuanto alguien toque uno.
 *
 * Acá adentro no hay nada que no pueda ver el navegador: constantes y funciones
 * puras. Nada consulta la base ni lee un secreto.
 */

import { aIdentificador } from '../identificador';

/** Largo máximo de un serial. Es una etiqueta pegada a un fierro, no un texto. */
export const LARGO_SERIAL = 64;

/** Largo mínimo. Menos de tres caracteres no identifica nada. */
export const MINIMO_SERIAL = 3;

/**
 * La normalización de un serial: sin espacios de sobra y en mayúsculas.
 *
 * Pasa por acá **quien escribe y quien busca**, igual que con el correo. El
 * índice único de la base distingue mayúsculas, así que sin esto «tvl-0001» y
 * «TVL-0001» son dos dispositivos distintos para el sistema y el mismo fierro
 * en el buque — y el día que uno de los dos reporte, la lectura se atribuye a
 * la fila equivocada.
 *
 * Mayúsculas y no minúsculas porque así viene grabado en la chapita del equipo,
 * y quien lo tipea lo está copiando de ahí.
 */
export function normalizarSerial(valor: string): string {
  return valor.trim().toUpperCase();
}

/**
 * ¿Esto tiene forma de serial?
 *
 * Deliberadamente flaco, como el chequeo del correo: letras, números, guiones,
 * puntos y dos puntos. Lo que rechaza es el espacio y el acento — un serial con
 * un espacio adentro es un error de tipeo o un rótulo puesto en el borne
 * equivocado, y las dos cosas terminan en una lectura sin dueño.
 *
 * No sabe qué numeración usa cada fabricante y no tiene por qué: el serial lo
 * elige el fierro, no este sistema.
 */
export function esSerial(valor: string): boolean {
  return /^[A-Z0-9][A-Z0-9.:-]*$/.test(normalizarSerial(valor)) && largoSerialOk(valor);
}

function largoSerialOk(valor: string): boolean {
  const limpio = normalizarSerial(valor);
  return limpio.length >= MINIMO_SERIAL && limpio.length <= LARGO_SERIAL;
}

/**
 * La clave con la que un dispositivo reporta una magnitud, derivada de su
 * rótulo.
 *
 * No hay campo donde tipearla, igual que el identificador de una empresa: se
 * deriva, se muestra mientras se escribe el rótulo y después no cambia. Es lo
 * que va a venir adentro del mensaje del microcontrolador, así que tiene que
 * ser estable y tiene que poder escribirse en un tópico sin escapar nada.
 *
 * «Tensión de barra» → «tension-de-barra».
 */
export function aClave(rotulo: string): string {
  return aIdentificador(rotulo);
}

/**
 * ¿El par de umbrales se sostiene?
 *
 * Un mínimo por encima del máximo es una alerta que se dispara siempre, con lo
 * cual deja de ser una alerta. Que falte uno de los dos, en cambio, es normal y
 * está previsto: una temperatura de bobinado tiene máximo y no tiene mínimo
 * útil, y ahí el vacío quiere decir «por ese lado no vigiles», que no es lo
 * mismo que un cero.
 */
export function umbralValido(min: number | null, max: number | null): boolean {
  if (min === null || max === null) return true;
  return min <= max;
}

/**
 * De lo que se tipeó en un borne de umbral al número que se guarda.
 *
 * El borne vacío es `null` —sin umbral de ese lado— y no cero. Lo que no es un
 * número devuelve `undefined`, que es distinto de las dos cosas anteriores:
 * significa «esto no se puede guardar» y quien llama lo trata como error.
 */
export function aUmbral(valor: string): number | null | undefined {
  const limpio = valor.trim().replace(',', '.');
  if (!limpio) return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : undefined;
}
