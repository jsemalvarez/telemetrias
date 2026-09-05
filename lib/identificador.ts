/**
 * El identificador de una empresa, derivado de su nombre.
 *
 * No hay un campo donde tipearlo: se deriva, se muestra antes de dar el alta y
 * después no cambia. Es lo que viaja adentro del token de cada sesión de esa
 * empresa y lo que se lee en los registros, así que tiene que ser estable y
 * tiene que poder escribirse en una URL sin escapar nada.
 *
 * Vive fuera de `lib/auth/` porque lo usan los dos lados: el servidor para
 * grabarlo y el formulario para mostrar, mientras se tipea el nombre, con qué
 * identificador va a quedar la empresa. Nada de acá adentro toca la base ni
 * lee un secreto, así que puede viajar al navegador.
 */

/** Largo máximo. Un identificador es una etiqueta, no una descripción. */
export const LARGO_IDENTIFICADOR = 40;

/**
 * «Astillero Ñandú S.A.» → «astillero-nandu-s-a»
 *
 * Las tildes se descomponen y se les saca el acento en vez de borrar la letra:
 * sin eso «Ártico» daría «rtico». La eñe se vuelve ene por el mismo camino, que
 * es lo que se espera de un identificador y no lo que se espera de un nombre —
 * por eso el nombre se guarda aparte, tal como se escribió.
 */
export function aIdentificador(nombre: string): string {
  return nombre
    .normalize('NFD')
    // Los acentos que NFD acaba de separar de su letra.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, LARGO_IDENTIFICADOR)
    .replace(/-+$/, '');
}
