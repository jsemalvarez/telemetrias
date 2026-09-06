import 'server-only';
import { Prisma } from '@prisma/client';
import { db } from '../db';

/**
 * Las mediciones: lo que el fierro dijo, y cuándo.
 *
 * Es la otra capa de `lib/dispositivos/padron.ts`, y la separación es a
 * propósito. El padrón lo escribe una persona en un formulario y se lee de a
 * decenas de filas; esto lo escribe una máquina cada pocos segundos y se lee de
 * a rangos de tiempo. Mezclarlas haría que la consulta más cara del sistema
 * viviera adentro del módulo que dibuja una lista.
 *
 * La traducción inglés↔español vive acá adentro entera, como allá: `value` es
 * `valor`, `measured_at` es `medidoEn`, `received_at` es `recibidoEn`. Ningún
 * handler traduce nada.
 *
 * Las tres consultas son SQL a mano y no `findMany`, y cada una tiene su razón
 * anotada abajo. Es la tabla que más va a crecer de todo el sistema: acá el
 * costo de una consulta de más se paga en cada pantalla y en cada reporte, no
 * una vez.
 */

/** Una medición tal como sale de este módulo. Las fechas van en ISO 8601. */
export type Lectura = {
  valor: number;
  /** Lo que dijo el equipo. */
  medidoEn: string;
  /** Lo que vio el servidor. La distancia entre las dos es la edad real. */
  recibidoEn: string;
};

type Fila = {
  magnitude_id: string;
  value: number;
  measured_at: Date;
  received_at: Date;
};

function aLectura(fila: Fila): Lectura {
  return {
    valor: fila.value,
    medidoEn: fila.measured_at.toISOString(),
    recibidoEn: fila.received_at.toISOString(),
  };
}

/**
 * Guarda un lote de lecturas de un mismo instante, y devuelve las que de verdad
 * entraron.
 *
 * `ON CONFLICT DO NOTHING` sobre la clave primaria `(magnitude_id,
 * measured_at)`: **el reintento del puente no duplica nada.** MQTT entrega al
 * menos una vez, y un puente al que se le venció el pedido vuelve a mandar lo
 * mismo sin saber si entró. Sin esto, cada reintento sumaría una fila idéntica
 * y todo promedio posterior saldría mal en silencio.
 *
 * El `RETURNING` es la otra mitad: `createMany({ skipDuplicates })` contesta
 * cuántas filas entraron, y lo que hay que poder decirle al puente es CUÁLES.
 * Un lote donde tres magnitudes son nuevas y una es un reintento tiene que
 * poder registrarse como tres y una, o el registro del puente no sirve para
 * encontrar nada.
 *
 * `received_at` no se manda: lo pone la base con su `DEFAULT`, y por eso el
 * valor que se devuelve acá es el que quedó guardado y no uno que este proceso
 * calculó por su cuenta. Es la marca de tiempo que nadie de afuera elige.
 */
export async function guardarLote(
  medidoEn: Date,
  filas: { magnitud: string; valor: number }[],
): Promise<{ magnitud: string; recibidoEn: string }[]> {
  if (!filas.length) return [];

  const valores = Prisma.join(
    filas.map((f) => Prisma.sql`(${f.magnitud}, ${medidoEn}, ${f.valor})`),
  );

  const puestas = await db.$queryRaw<{ magnitude_id: string; received_at: Date }[]>`
    INSERT INTO "measurements" ("magnitude_id", "measured_at", "value")
    VALUES ${valores}
    ON CONFLICT DO NOTHING
    RETURNING "magnitude_id", "received_at"
  `;

  return puestas.map((p) => ({
    magnitud: p.magnitude_id,
    recibidoEn: p.received_at.toISOString(),
  }));
}

/**
 * La última lectura de cada magnitud de una lista. Es lo que mira la pantalla.
 *
 * `DISTINCT ON` y no una consulta por magnitud: un padrón con doce
 * dispositivos de cuatro magnitudes cada uno son cuarenta y ocho consultas
 * para dibujar una lista, y eso se nota en la pantalla que más se abre. Con el
 * `ORDER BY (magnitude_id, measured_at DESC)` Postgres recorre el mismo btree
 * de la clave primaria y se saltea el resto de cada magnitud sin leerlo, que es
 * exactamente para lo que se eligió esa clave.
 *
 * Devuelve un mapa porque quien llama tiene el padrón y necesita cruzarlo por
 * id de magnitud; una lista lo obligaría a armar el mapa afuera, y eso ya es la
 * mitad de este módulo escrita en una pantalla.
 */
export async function ultimaPorMagnitud(magnitudes: string[]): Promise<Map<string, Lectura>> {
  if (!magnitudes.length) return new Map();

  const filas = await db.$queryRaw<Fila[]>`
    SELECT DISTINCT ON ("magnitude_id")
      "magnitude_id", "value", "measured_at", "received_at"
    FROM "measurements"
    WHERE "magnitude_id" IN (${Prisma.join(magnitudes)})
    ORDER BY "magnitude_id", "measured_at" DESC
  `;

  return new Map(filas.map((f) => [f.magnitude_id, aLectura(f)]));
}

/**
 * Las últimas lecturas de cada magnitud, sobre un rango de tiempo. Es lo que
 * contesta el `GET`.
 *
 * El límite es POR MAGNITUD y no del total, que es lo que hace útil la
 * respuesta: pedir las últimas cincuenta de un dispositivo que mide cuatro
 * cosas tiene que dar cincuenta de cada una, y no cincuenta de la que reportó
 * más seguido y ninguna de las otras tres.
 *
 * Eso es una `ROW_NUMBER()` particionada y no un `LIMIT`, y por eso esta
 * consulta es una sola y no una por magnitud. La partición ordenada por
 * `measured_at DESC` vuelve a caer sobre la clave primaria.
 */
export async function seriePorMagnitud(
  magnitudes: string[],
  filtros: { desde?: Date; hasta?: Date; limite: number },
): Promise<Map<string, Lectura[]>> {
  if (!magnitudes.length) return new Map();

  const condiciones = [Prisma.sql`"magnitude_id" IN (${Prisma.join(magnitudes)})`];
  if (filtros.desde) condiciones.push(Prisma.sql`"measured_at" >= ${filtros.desde}`);
  if (filtros.hasta) condiciones.push(Prisma.sql`"measured_at" <= ${filtros.hasta}`);

  const filas = await db.$queryRaw<Fila[]>`
    SELECT "magnitude_id", "value", "measured_at", "received_at"
    FROM (
      SELECT
        "magnitude_id", "value", "measured_at", "received_at",
        ROW_NUMBER() OVER (
          PARTITION BY "magnitude_id" ORDER BY "measured_at" DESC
        ) AS "n"
      FROM "measurements"
      WHERE ${Prisma.join(condiciones, ' AND ')}
    ) AS "t"
    WHERE "n" <= ${filtros.limite}::int8
    ORDER BY "magnitude_id", "measured_at" DESC
  `;

  const agrupadas = new Map<string, Lectura[]>();
  for (const fila of filas) {
    const lista = agrupadas.get(fila.magnitude_id);
    if (lista) lista.push(aLectura(fila));
    else agrupadas.set(fila.magnitude_id, [aLectura(fila)]);
  }
  return agrupadas;
}
