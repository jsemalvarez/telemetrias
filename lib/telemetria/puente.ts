import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * La puerta del puente.
 *
 * **Quien se autentica acá es el puente, no el dispositivo.** La arquitectura
 * es `microcontrolador --MQTT--> Mosquitto --MQTT--> puente --REST--> la app`:
 * Mosquitto es un broker MQTT puro —sin webhooks ni motor de reglas, a
 * diferencia de EMQX o HiveMQ— así que en el medio hay un proceso que se
 * suscribe a los tópicos y le hace POST a esta aplicación. El equipo se
 * autentica contra el broker, con su usuario y su clave MQTT; eso es otra capa
 * y otro problema. Lo que llega hasta acá es un solo proceso, con una sola
 * credencial de servicio.
 *
 * Que sea una y no una por equipo es la consecuencia de esa forma, y conviene
 * tenerla escrita: **esta clave puede reportar en nombre de cualquier serial
 * declarado.** Lo que la acota es lo que puede hacer, que es agregar filas a
 * `measurements` y nada más — no lee, no borra, no toca el padrón. Por eso el
 * `GET` de al lado NO la acepta: una credencial de máquina que además leyera
 * las mediciones de todas las empresas sería, perdida, el aislamiento entero
 * del producto; perdida como está, es alguien escribiendo lecturas falsas, que
 * se ve y se corta rotando la clave.
 */

/**
 * Largo mínimo de la clave, del mismo orden que el de `AUTH_SECRETO`.
 *
 * Una clave corta configurada por descuido —`PUENTE_CLAVE=test`— es peor que no
 * tener ninguna, porque parece que hay una. Acá se trata igual que si faltara.
 */
export const CLAVE_MINIMA = 24;

export type Puerta = 'ok' | 'sin-credencial' | 'no-configurado';

/** El resumen de un texto. Comparar dos de éstos siempre compara largos iguales. */
const resumen = (valor: string) => createHash('sha256').update(valor, 'utf8').digest();

/**
 * ¿Este pedido trae la credencial del puente?
 *
 * Tres respuestas y no dos, porque una de ellas no es culpa de quien llama:
 * `no-configurado` es que a este servidor le falta `PUENTE_CLAVE`, y contestar
 * eso con un 401 mandaría al operador del puente a revisar su clave durante una
 * hora. Es un 503 y el registro del servidor lo dice.
 *
 * **La falta de configuración nunca abre la puerta.** Es la única forma en que
 * un despliegue al que se le olvidó la variable falla ruidosamente en vez de
 * quedar aceptando lecturas de cualquiera.
 *
 * La comparación es en tiempo constante sobre los resúmenes SHA-256 de las dos
 * claves, y sobre los resúmenes justamente porque `timingSafeEqual` se niega a
 * comparar largos distintos: pasarle los textos crudos obligaría a chequear el
 * largo antes, y ese chequeo filtra por tiempo cuántos caracteres tiene la
 * clave. Dos resúmenes miden siempre 32 bytes.
 */
export function autenticaPuente(cabeceras: Headers): Puerta {
  const clave = process.env.PUENTE_CLAVE?.trim();
  if (!clave || clave.length < CLAVE_MINIMA) return 'no-configurado';

  const autorizacion = cabeceras.get('authorization') ?? '';
  const [esquema, ...resto] = autorizacion.split(' ');
  if (esquema.toLowerCase() !== 'bearer') return 'sin-credencial';

  const presentada = resto.join(' ').trim();
  if (!presentada) return 'sin-credencial';

  return timingSafeEqual(resumen(presentada), resumen(clave)) ? 'ok' : 'sin-credencial';
}
