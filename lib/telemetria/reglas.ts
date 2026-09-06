/**
 * Reglas de la telemetría que valen en los dos lados.
 *
 * Existe por la misma razón que `lib/dispositivos/reglas.ts`: el servidor las
 * hace cumplir sobre lo que llega del puente, y la pantalla las usa para
 * escribir la edad de un dato sin volver a inventar el formato.
 *
 * Acá adentro no hay nada que no pueda ver el navegador: constantes y funciones
 * puras. Nada consulta la base ni lee un secreto.
 *
 * Todo lo de acá es DETERMINISTA a propósito, igual que `lib/registro.ts`: el
 * servidor y el cliente tienen que escribir exactamente la misma cadena o React
 * reporta desajuste de hidratación. Por eso no hay `toLocaleString` en ninguna
 * de estas funciones — el formato de un número o de una fecha depende de la
 * configuración regional de quien lo corre, y el servidor y el navegador no
 * tienen por qué compartirla.
 */

const MINUTO = 60_000;

/**
 * Cuánto se le tolera a un reloj que viene adelantado.
 *
 * Una lectura fechada en el futuro no es un dato raro: es un dato que se queda
 * para siempre arriba de todos los demás, porque «la última» se decide por
 * `medidoEn`. Un microcontrolador con el reloj en 2031 taparía cada lectura
 * verdadera que llegue después, y la pantalla mostraría un valor de hace un año
 * como si fuera el de ahora.
 *
 * Cinco minutos porque un reloj de equipo se corre, y rechazar por dos segundos
 * de deriva sería tirar datos buenos. El pasado, en cambio, no tiene límite: un
 * buque que estuvo quince días sin señal descarga quince días de lecturas
 * viejas, y ése es el caso normal de este producto y no un error.
 */
export const ADELANTO_TOLERADO_MS = 5 * MINUTO;

/**
 * De lo que vino en el mensaje a un instante, o `null` si no se puede leer uno.
 *
 * Sólo texto ISO 8601 **con huso horario explícito**, y las dos exigencias
 * tienen su motivo:
 *
 *   — Un número no se acepta porque es ambiguo entre segundos y milisegundos, y
 *     equivocarse en eso pone la lectura en 1970 o en el año 57000. El puente
 *     que lo mande tiene que decir cuál de los dos es, y la forma de decirlo es
 *     escribir la fecha.
 *   — Sin huso, `new Date('2026-09-06T14:32:10')` se interpreta en la hora
 *     LOCAL de quien la parsea. El servidor corre en UTC y el navegador en
 *     −03: la misma cadena serían dos instantes con tres horas de diferencia,
 *     y nadie se enteraría hasta que una lectura apareciera con tres horas de
 *     edad recién nacida.
 */
export function aInstante(valor: unknown): Date | null {
  if (typeof valor !== 'string') return null;

  const limpio = valor.trim();
  /* Fecha, hora, y un huso que no se puede omitir: `Z` o `±HH:MM`. */
  if (!/^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|z|[+-]\d{2}:?\d{2})$/.test(limpio)) {
    return null;
  }

  const fecha = new Date(limpio);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * De lo que vino como lectura al número que se guarda.
 *
 * `undefined` es «esto no es un número», y quien llama lo trata como una clave
 * que se ignora — no como un mensaje que se tira: un campo mal formado no
 * debería costarle al buque las otras siete lecturas del mismo reporte.
 *
 * Acepta un número o un texto numérico, porque un firmware que arma su JSON a
 * mano suele mandar comillas. Lo que NO acepta es la coma decimal, a diferencia
 * de `aUmbral`: ahí escribe una persona en un teclado de acá, y acá escribe una
 * máquina. Un «398,4» que llega por este endpoint es un error de configuración
 * regional del puente, y taparlo es garantizar que nadie lo encuentre.
 */
export function aValor(valor: unknown): number | undefined {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : undefined;
  if (typeof valor !== 'string') return undefined;

  const limpio = valor.trim();
  /* `Number('')` es cero, que sería inventar una lectura de la nada. */
  if (!limpio) return undefined;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : undefined;
}

/**
 * Qué tan viejo es un dato, en el idioma del producto.
 *
 * Se escribe siempre y para todas las edades, incluidas las de días: «sin
 * conexión es un estado normal», así que una lectura de hace una semana no es
 * un error que haya que esconder — es la respuesta correcta a la pregunta de
 * cuándo reportó ese equipo por última vez.
 *
 * Menos de un minuto es «recién» y no «hace 0 min», que se lee como un
 * instrumento roto. Un adelanto dentro de la tolerancia cae acá también, que es
 * lo honesto: el dato es de ahora y el reloj del equipo se corrió unos segundos.
 */
export function edadTexto(ms: number): string {
  if (ms < MINUTO) return 'recién';

  const minutos = Math.floor(ms / MINUTO);
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 48) {
    const resto = minutos % 60;
    return resto === 0 ? `hace ${horas} h` : `hace ${horas} h ${resto} min`;
  }

  const dias = Math.floor(horas / 24);
  return `hace ${dias} días`;
}

/**
 * Un valor medido, escrito para que lo lea una persona.
 *
 * Coma decimal, que es como se escribe un número acá, y tres decimales de tope
 * porque más que eso en el frente de un tablero es ruido: la precisión que
 * sobra está guardada tal cual en la base, que es donde importa.
 *
 * A mano y no con `toLocaleString` porque esto lo escriben el servidor y el
 * navegador, y tienen que escribir lo mismo.
 */
export function cifraTexto(valor: number): string {
  return String(Math.round(valor * 1000) / 1000).replace('.', ',');
}
