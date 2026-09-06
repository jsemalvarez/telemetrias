import 'server-only';
import type { NextResponse } from 'next/server';
import { alcanzaCliente, puede, type Permiso } from '../auth/roles';
import { sesionActual } from '../auth/servidor';
import type { Sesion } from '../auth/sesion';
import { error } from '../respuestas';
import { clienteDelDispositivo, clienteDeLaMagnitud } from './padron';

/**
 * La puerta de todas las rutas que tocan un dispositivo.
 *
 * Cuatro rutas hacen exactamente los mismos tres pasos antes de escribir nada:
 * mirar el permiso, buscar de qué empresa es el dispositivo, y pasar esa
 * empresa por `alcanzaCliente`. Escrito cuatro veces, alcanza con que una de
 * las cuatro se saltee el tercero para que el corte entre empresas deje de
 * existir en esa ruta — y la que se saltea es siempre la que se agregó
 * apurado. Escrito una vez, no hay dónde saltearlo.
 *
 * El identificador del dispositivo llega en la URL, o sea de afuera, igual que
 * el `clientId` que puede venir en el cuerpo de un alta. Se trata igual: se usa
 * para buscar, y lo que se encontró se pasa por el corte antes de devolverlo.
 *
 * «No existe» y «no es de tu empresa» contestan lo mismo, como en el
 * restablecimiento de contraseña. Una respuesta distinta convertiría esta ruta
 * en una manera de averiguar qué hay instalado en el padrón de al lado, que es
 * justo lo que el aislamiento promete que no se puede.
 */

export type Guarda<T> = { ok: true; sesion: Sesion; dato: T } | { ok: false; respuesta: NextResponse };

const NO_ESTA = () =>
  error('dispositivo', 'Ese dispositivo no existe, o no es de una empresa que alcances.', 404);

/**
 * Resuelve un dispositivo de la URL contra la sesión y el permiso que hace
 * falta para el acto que sigue.
 *
 * El permiso es un parámetro porque las rutas que llegan acá no piden lo mismo:
 * fijar un umbral es `umbral:definir` —el verbo del encargado— y corregir el
 * padrón es `dispositivo:administrar`, que el encargado no tiene. Es el mismo
 * dispositivo, mirado por dos personas con dos alcances.
 */
export async function conDispositivo(
  id: string,
  permiso: Permiso,
): Promise<Guarda<{ id: string; cliente: string; rotulo: string; activo: boolean }>> {
  const sesion = await sesionActual();
  if (!sesion || !puede(sesion, permiso)) {
    return { ok: false, respuesta: error('permiso', 'Esta sesión no alcanza para eso.', 403) };
  }

  const dispositivo = await clienteDelDispositivo(id);
  /* Las dos salidas dan la misma respuesta a propósito: la de arriba es que no
     existe y la de abajo es que es de otra empresa, y distinguirlas sería
     contestar la pregunta «¿qué tienen instalado los de al lado?». */
  if (!dispositivo) return { ok: false, respuesta: NO_ESTA() };
  if (!alcanzaCliente(sesion, dispositivo.cliente)) return { ok: false, respuesta: NO_ESTA() };

  return { ok: true, sesion, dato: { id, ...dispositivo } };
}

/**
 * Lo mismo para una magnitud, que hereda la empresa de su dispositivo.
 *
 * Comprueba además que la magnitud sea del dispositivo que nombra la URL. Sin
 * eso, `/api/dispositivos/<uno mío>/magnitudes/<una ajena>` pasaría el corte
 * por el dispositivo de la URL y escribiría sobre la magnitud del cuerpo: la
 * ruta anidada tiene que ser una ruta y no dos identificadores sueltos que se
 * validan por separado.
 */
export async function conMagnitud(
  dispositivo: string,
  magnitud: string,
  permiso: Permiso,
): Promise<Guarda<{ id: string; cliente: string; rotulo: string }>> {
  const sesion = await sesionActual();
  if (!sesion || !puede(sesion, permiso)) {
    return { ok: false, respuesta: error('permiso', 'Esta sesión no alcanza para eso.', 403) };
  }

  const dato = await clienteDeLaMagnitud(magnitud);
  if (!dato || dato.dispositivo !== dispositivo) return { ok: false, respuesta: NO_ESTA() };
  if (!alcanzaCliente(sesion, dato.cliente)) return { ok: false, respuesta: NO_ESTA() };

  return { ok: true, sesion, dato: { id: magnitud, cliente: dato.cliente, rotulo: dato.rotulo } };
}
