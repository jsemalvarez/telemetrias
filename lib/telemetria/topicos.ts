/**
 * Los tópicos del broker: por dónde habla un equipo.
 *
 * La cadena es
 *
 *     microcontrolador --MQTT--> Mosquitto --MQTT--> puente --REST--> la app
 *
 * y esto es la primera flecha. Un dispositivo publica abajo de su propio
 * serial, el puente escucha todos y traduce cada mensaje al POST que
 * `/api/reportes` ya sabe recibir.
 *
 *     tecvol/TVL-0001/lecturas                    {"tension-de-barra": 398.4, ...}
 *     tecvol/TVL-0001/lecturas/tension-de-barra   398.4
 *
 * **Las dos formas valen, y no es indecisión.** La de arriba es la que manda un
 * equipo que mide varias cosas a la vez —un microcontrolador no publica un
 * mensaje por sensor— y es la que llega entera y con un solo instante. La de
 * abajo existe porque es lo que sale de un firmware escrito en veinte minutos,
 * de un `mosquitto_pub` a mano y de casi cualquier ejemplo de ESP32 dando
 * vueltas: negarla obligaría a reescribir el firmware antes de poder ver una
 * aguja moverse. El puente las junta igual (ver `scripts/puente.ts`).
 *
 * **El tópico se deriva del serial y no se guarda al lado.** Es la misma
 * decisión que ya está escrita en `prisma/schema.prisma`, sobre la columna
 * `serial`: dos columnas que tienen que coincidir son dos columnas que algún
 * día van a discrepar. El serial ya es único en todo el sistema y ya es lo que
 * el equipo trae grabado, así que alcanza.
 *
 * **Y es también el corte de seguridad del broker.** El usuario MQTT de un
 * equipo *es* su serial, y el ACL de Mosquitto sólo lo deja publicar abajo de
 * `tecvol/%u/`. Un equipo no puede reportar en nombre de otro, que es
 * exactamente la parte que la credencial del puente —una sola, de servicio— no
 * puede garantizar del otro lado. Dos capas distintas y dos alcances distintos.
 *
 * ── Un archivo que el broker no puede leer ────────────────────────────────
 *
 * `mosquitto/acl` repite esta forma en su propio idioma, porque Mosquitto no
 * lee TypeScript. Son dos archivos que tienen que coincidir y no hay forma de
 * que sea uno solo: si acá cambia `RAIZ` o la palabra `lecturas`, hay que
 * cambiar el ACL en el mismo commit. Queda escrito en los dos lados.
 *
 * Acá adentro no hay nada que no pueda ver el navegador: constantes y funciones
 * puras. Nada consulta la base ni lee un secreto — así la pantalla que declara
 * un equipo puede, el día que haga falta, mostrar en qué tópico va a hablar.
 */

import { esSerial, normalizarSerial } from '../dispositivos/reglas';

/**
 * El usuario con el que se conecta el puente al broker.
 *
 * Vive acá y no en el script porque es la otra mitad del mismo ACL: el
 * archivo `mosquitto/acl` nombra a este usuario en letra para darle lectura
 * sobre todos los tópicos, y a ningún otro. Cambiarlo de un solo lado es un
 * puente que se conecta y no recibe nada, sin un error que lo explique.
 *
 * En minúsculas, y los seriales van en mayúsculas: no hay forma de que un
 * equipo se llame como el puente.
 */
export const USUARIO_PUENTE = 'puente';

/**
 * La raíz de todo lo que publica el parque instalado.
 *
 * Un nivel propio y no la raíz pelada del broker: el día que ese broker sostenga
 * algo más que esta telemetría, lo de acá sigue estando junto y se puede dar
 * permiso sobre todo el ramo con una línea.
 */
export const RAIZ = 'tecvol';

/** El nivel que dice qué clase de mensaje es. Hoy hay uno solo, y por eso está. */
const LECTURAS = 'lecturas';

/** Dónde publica un equipo todo lo que midió en un instante. */
export function topicoDe(serial: string): string {
  return `${RAIZ}/${normalizarSerial(serial)}/${LECTURAS}`;
}

/** Dónde publica una sola magnitud, cuando las manda por separado. */
export function topicoDeMagnitud(serial: string, clave: string): string {
  return `${topicoDe(serial)}/${clave}`;
}

/**
 * A qué se suscribe el puente.
 *
 * Dos suscripciones y no `tecvol/#`: el comodín de cola se llevaría también
 * cualquier nivel que alguien agregue mañana abajo del serial —un `estado`, un
 * `configuracion`— y el puente los postearía como si fueran lecturas. Pedir
 * exactamente lo que se sabe leer es lo que hace que agregar un ramo nuevo no
 * rompa éste.
 */
export const SUSCRIPCIONES = [`${RAIZ}/+/${LECTURAS}`, `${RAIZ}/+/${LECTURAS}/+`];

/** Qué equipo habló, y si dijo una sola magnitud o todas juntas. */
export type Origen = { serial: string; clave?: string };

/**
 * De un tópico que llegó al equipo que lo publicó.
 *
 * `null` es «esto no es un tópico de lecturas», y quien llama lo descarta. No
 * debería pasar —el broker sólo entrega lo suscripto— pero un `null` acá es una
 * línea en el registro y un `throw` sería el puente entero cayéndose por un
 * mensaje suelto.
 *
 * El serial se valida con la misma función que usa el padrón: uno con un
 * espacio adentro no puede estar declarado, y no hace falta un POST para
 * saberlo.
 */
export function leerTopico(topico: string): Origen | null {
  const partes = topico.split('/');
  if (partes.length < 3 || partes.length > 4) return null;

  const [raiz, serial, tipo, clave] = partes;
  if (raiz !== RAIZ || tipo !== LECTURAS) return null;
  if (!esSerial(serial)) return null;
  if (partes.length === 4 && !clave.trim()) return null;

  return partes.length === 4
    ? { serial: normalizarSerial(serial), clave }
    : { serial: normalizarSerial(serial) };
}
