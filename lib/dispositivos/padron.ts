import 'server-only';
import { db } from '../db';
import { aClave, normalizarSerial } from './reglas';

/**
 * El padrón de dispositivos.
 *
 * Un dispositivo es el microcontrolador que se instala sobre el equipo para que
 * reporte. Esto es el padrón —qué hay instalado, de quién es, qué mide y entre
 * qué valores— y no la telemetría: lo que cada uno haya medido es otra tabla y
 * otra capa, que desde el 2026-09-06 existe y vive en `lib/telemetria/`.
 * Ninguna función de acá lee una medición, y ninguna inventa una.
 *
 * Lo único que este módulo le presta a esa capa es `dispositivoQueReporta`: a
 * qué fila del padrón corresponde un serial que acaba de hablar. Va acá porque
 * es una pregunta sobre el padrón —quién es este fierro y bajo qué claves
 * reporta—, y la contesta quien tiene la respuesta.
 *
 * Los nombres de la base están en inglés y los de la aplicación en español, así
 * que acá adentro hay una traducción, y vive acá adentro entera: `aDispositivo`
 * y `aMagnitud` son las dos únicas funciones del proyecto que saben que
 * `rotulo` se llama `label`. Ningún handler traduce nada.
 *
 * El `import 'server-only'` rompe el build si alguien importa este módulo desde
 * un componente cliente. Los tipos sí pueden cruzar —`import type` se borra al
 * compilar—, que es como los usa la pantalla.
 */

/**
 * Una magnitud que un dispositivo reporta, con los umbrales que disparan su
 * alerta.
 *
 * `min` y `max` en nulo quieren decir «sin umbral de ese lado», que no es lo
 * mismo que cero: una temperatura de bobinado se vigila por arriba y nada más.
 */
export type Magnitud = {
  id: string;
  /** Con esto la nombra el microcontrolador adentro de su mensaje. */
  clave: string;
  rotulo: string;
  unidad: string | null;
  min: number | null;
  max: number | null;
};

/** Un dispositivo tal como lo ve la pantalla. Nunca lleva la empresa: eso lo
 *  decide el corte antes de llegar acá, y una pantalla no lo vuelve a mirar. */
export type Dispositivo = {
  id: string;
  /** Lo que el fierro dice de sí mismo. Único en todo el sistema. */
  serial: string;
  rotulo: string;
  ubicacion: string | null;
  magnitudes: Magnitud[];
};

/** Lo mínimo que hay que traer para armar un `Dispositivo`. */
const CON_MAGNITUDES = {
  magnitudes: { where: { active: true }, orderBy: { createdAt: 'asc' } },
} as const;

type FilaMagnitud = {
  id: string;
  key: string;
  label: string;
  unit: string | null;
  min: number | null;
  max: number | null;
};

type FilaDispositivo = {
  id: string;
  serial: string;
  label: string;
  location: string | null;
  magnitudes: FilaMagnitud[];
};

function aMagnitud(fila: FilaMagnitud): Magnitud {
  return {
    id: fila.id,
    clave: fila.key,
    rotulo: fila.label,
    unidad: fila.unit,
    min: fila.min,
    max: fila.max,
  };
}

function aDispositivo(fila: FilaDispositivo): Dispositivo {
  return {
    id: fila.id,
    serial: fila.serial,
    rotulo: fila.label,
    ubicacion: fila.location,
    magnitudes: fila.magnitudes.map(aMagnitud),
  };
}

/**
 * El padrón de una empresa, partido en dos por el estado de servicio.
 *
 * Las dos listas y no sólo la de los activos porque la baja es blanda y tiene
 * que tener vuelta: el serial de un equipo dado de baja sigue tomado —es el
 * mismo fierro—, así que sin poder verlo, quien lo dio de baja por error se
 * queda sin manera de volver a darlo de alta. Un equipo desconectado sigue
 * estando en el plano.
 *
 * Una sola consulta para las dos: el padrón de una empresa entra holgado en la
 * memoria y partirlo acá cuesta menos que ir dos veces.
 */
export async function padronDe(
  cliente: string,
): Promise<{ enServicio: Dispositivo[]; fueraDeServicio: Dispositivo[] }> {
  const filas = await db.device.findMany({
    where: { clientId: cliente },
    orderBy: { label: 'asc' },
    include: CON_MAGNITUDES,
  });

  return {
    enServicio: filas.filter((f) => f.active).map(aDispositivo),
    fueraDeServicio: filas.filter((f) => !f.active).map(aDispositivo),
  };
}

/**
 * De qué empresa es un dispositivo, para que quien lo vaya a tocar pase por
 * `alcanzaCliente` antes de tocarlo.
 *
 * Devuelve la empresa y no el dispositivo entero a propósito: un handler que
 * recibe el objeto completo antes de decidir el corte es un handler al que se
 * le puede escapar el objeto completo en un mensaje de error.
 */
export async function clienteDelDispositivo(
  id: string,
): Promise<{ cliente: string; rotulo: string; activo: boolean } | null> {
  const fila = await db.device.findUnique({
    where: { id },
    select: { clientId: true, label: true, active: true },
  });
  return fila ? { cliente: fila.clientId, rotulo: fila.label, activo: fila.active } : null;
}

/**
 * Lo mismo para una magnitud: de qué empresa es, por medio de su dispositivo.
 *
 * Una magnitud no tiene empresa propia —la hereda del fierro donde está
 * montada— y eso es deliberado: un solo lugar donde se decide de quién es cada
 * cosa, que es el dispositivo. Devuelve además el id del dispositivo, porque
 * quien la edita casi siempre necesita releerlo.
 */
export async function clienteDeLaMagnitud(
  id: string,
): Promise<{ cliente: string; dispositivo: string; rotulo: string } | null> {
  const fila = await db.magnitude.findUnique({
    where: { id },
    select: { label: true, deviceId: true, device: { select: { clientId: true } } },
  });
  return fila
    ? { cliente: fila.device.clientId, dispositivo: fila.deviceId, rotulo: fila.label }
    : null;
}

/**
 * De quién es un serial, si ya es de alguien.
 *
 * El índice es único en todo el sistema —dos empresas no pueden declarar el
 * mismo fierro—, así que un alta puede chocar contra una empresa que quien la
 * intenta no puede ver. Devuelve de quién es y **quien llama decide cuánto de
 * eso dice**, igual que con `duenoDelCorreo`: no es lo mismo contestarle a un
 * super, que cruza el corte, que a un administrador, que no.
 *
 * Informa también si está dado de baja, porque ése es el choque que tiene
 * arreglo y el mensaje tiene que poder decirlo.
 */
export async function duenoDelSerial(
  serial: string,
): Promise<{ id: string; rotulo: string; cliente: string; activo: boolean } | null> {
  const fila = await db.device.findUnique({
    where: { serial: normalizarSerial(serial) },
    select: { id: true, label: true, clientId: true, active: true },
  });
  return fila
    ? { id: fila.id, rotulo: fila.label, cliente: fila.clientId, activo: fila.active }
    : null;
}

/**
 * A qué fila del padrón corresponde un serial que acaba de reportar, con las
 * claves bajo las que ese equipo declara medir.
 *
 * Es la consulta de la ingesta, y por eso trae lo que la ingesta necesita
 * decidir, que no es lo mismo que muestra la pantalla:
 *
 *   — La empresa, aunque nadie la use para cortar nada. Acá no hay sesión que
 *     pasar por `alcanzaCliente`: el que llegó es el puente, que no es de
 *     ninguna empresa y reporta para todas. El corte de este endpoint es otro
 *     —el serial tiene que estar declarado— y el aislamiento se cumple del
 *     lado de la lectura, que sí pide sesión.
 *   — Si está en servicio, para poder decirlo en la respuesta. La lectura de
 *     un equipo dado de baja se guarda igual: el fierro está hablando y
 *     negarlo no lo hace callar. Lo que cambia es que la pantalla no lo muestra
 *     entre los activos, que es donde esa decisión pertenece.
 *   — **Las magnitudes dadas de baja también**, con su marca. Sin ellas, una
 *     clave que alguien retiró del padrón se vería igual que una que nunca
 *     existió, y son dos cosas distintas: una es un firmware que reporta de más
 *     y la otra es un equipo que sigue midiendo algo que ya no se vigila. El
 *     puente tiene que poder registrar cuál de las dos le pasó.
 */
export async function dispositivoQueReporta(serial: string): Promise<{
  id: string;
  rotulo: string;
  cliente: string;
  activo: boolean;
  magnitudes: { id: string; clave: string; activa: boolean }[];
} | null> {
  const fila = await db.device.findUnique({
    where: { serial: normalizarSerial(serial) },
    select: {
      id: true,
      label: true,
      clientId: true,
      active: true,
      magnitudes: { select: { id: true, key: true, active: true } },
    },
  });
  if (!fila) return null;

  return {
    id: fila.id,
    rotulo: fila.label,
    cliente: fila.clientId,
    activo: fila.active,
    magnitudes: fila.magnitudes.map((m) => ({ id: m.id, clave: m.key, activa: m.active })),
  };
}

/**
 * Alta de un dispositivo en el padrón de una empresa.
 *
 * La empresa llega como parámetro y quien llama ya la pasó por
 * `alcanzaCliente`: este módulo escribe lo que le mandan, igual que
 * `crearMiembro`. Nace sin magnitudes — qué mide se declara después, y se
 * declara como dato porque cuáles son no está decidido.
 */
export async function crearDispositivo(datos: {
  cliente: string;
  serial: string;
  rotulo: string;
  ubicacion: string | null;
  /** El id de quien firma el alta. Queda en la fila y no se puede borrar. */
  creadoPor: string;
}): Promise<Dispositivo> {
  const fila = await db.device.create({
    data: {
      serial: normalizarSerial(datos.serial),
      label: datos.rotulo,
      location: datos.ubicacion,
      clientId: datos.cliente,
      createdById: datos.creadoPor,
    },
    include: CON_MAGNITUDES,
  });
  return aDispositivo(fila);
}

/**
 * Corrección de los datos de un dispositivo.
 *
 * El serial se puede corregir, y tiene que poder corregirse: se tipea copiando
 * una chapita en una sala de máquinas y ahí se erra. Lo que no puede es
 * cambiar de empresa — un fierro no se muda de armador desde un formulario, y
 * si eso llegara a hacer falta va a ser un acto con su propio nombre.
 */
export async function editarDispositivo(
  id: string,
  datos: { serial: string; rotulo: string; ubicacion: string | null },
): Promise<Dispositivo> {
  const fila = await db.device.update({
    where: { id },
    data: {
      serial: normalizarSerial(datos.serial),
      label: datos.rotulo,
      location: datos.ubicacion,
    },
    include: CON_MAGNITUDES,
  });
  return aDispositivo(fila);
}

/**
 * Baja de un dispositivo: sale de servicio, no de la base.
 *
 * Blanda por la misma razón que la de un usuario, y por una más: sus umbrales
 * son trabajo hecho —alguien decidió entre qué valores vigilar ese equipo— y
 * borrarlos porque el fierro salió a reparar obliga a rehacerlos cuando vuelve.
 * Las magnitudes quedan tal cual; lo único que se apaga es la fila de arriba.
 */
export async function darDeBaja(id: string): Promise<void> {
  await db.device.update({ where: { id }, data: { active: false } });
}

/** Y la vuelta, que es lo que hace que la baja sea segura. */
export async function volverAlServicio(id: string): Promise<void> {
  await db.device.update({ where: { id }, data: { active: true } });
}

/**
 * Alta de una magnitud sobre un dispositivo.
 *
 * `upsert` y no `create`, sobre el par dispositivo–clave: una magnitud dada de
 * baja deja su fila ocupando la clave, y sin esto quien se equivocó de unidad y
 * la dio de baja no puede volver a declararla. Reactivarla conserva además los
 * umbrales que tuviera, que es lo que quien la rehace habría vuelto a tipear.
 *
 * La clave se deriva del rótulo acá adentro. Lo que manda el navegador es lo
 * que la persona escribió; una clave que llegara de afuera sería un campo que
 * alguien elige a mano, y esa clave es con la que el fierro va a hablar.
 */
export async function crearMagnitud(
  dispositivo: string,
  datos: { rotulo: string; unidad: string | null; min: number | null; max: number | null },
): Promise<Magnitud> {
  const clave = aClave(datos.rotulo);
  const fila = await db.magnitude.upsert({
    where: { deviceId_key: { deviceId: dispositivo, key: clave } },
    create: {
      deviceId: dispositivo,
      key: clave,
      label: datos.rotulo,
      unit: datos.unidad,
      min: datos.min,
      max: datos.max,
    },
    update: {
      active: true,
      label: datos.rotulo,
      unit: datos.unidad,
      min: datos.min,
      max: datos.max,
    },
  });
  return aMagnitud(fila);
}

/**
 * El umbral de una magnitud: el acto del encargado.
 *
 * Es lo único que `umbral:definir` habilita a escribir, y por eso es una
 * función que no toca ninguna otra columna. El rótulo, la unidad y la clave son
 * padrón —los pone quien declara el equipo— y una función que los aceptara «de
 * paso» convertiría el permiso del encargado en el del administrador.
 */
export async function fijarUmbral(
  id: string,
  umbral: { min: number | null; max: number | null },
): Promise<Magnitud> {
  const fila = await db.magnitude.update({
    where: { id },
    data: { min: umbral.min, max: umbral.max },
  });
  return aMagnitud(fila);
}

/**
 * Baja de una magnitud. Blanda como la del dispositivo: el día que haya
 * mediciones, cada una nombra la magnitud que la produjo.
 */
export async function bajaMagnitud(id: string): Promise<void> {
  await db.magnitude.update({ where: { id }, data: { active: false } });
}
