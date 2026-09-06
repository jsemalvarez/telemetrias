import { dispositivoQueReporta } from '@/lib/dispositivos/padron';
import { esSerial, normalizarSerial } from '@/lib/dispositivos/reglas';
import { guardarLote } from '@/lib/telemetria/mediciones';
import { autenticaPuente } from '@/lib/telemetria/puente';
import { ADELANTO_TOLERADO_MS, aInstante, aValor } from '@/lib/telemetria/reglas';
import { cuerpoDe, error, listo, texto } from '@/lib/respuestas';

/* Prisma no corre en Edge. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * La ingesta de telemetría: por acá entra lo que miden los equipos.
 *
 *     microcontrolador --MQTT--> Mosquitto --MQTT--> puente --REST--> acá
 *
 * Mosquitto no habla HTTP por sí solo —es un broker MQTT puro, sin webhooks ni
 * motor de reglas, a diferencia de EMQX o HiveMQ— así que entre el broker y
 * esta aplicación hay un proceso puente que se suscribe a los tópicos y hace
 * este POST. **Lo que se autentica acá es ese puente y no cada dispositivo:**
 * una sola credencial de servicio, en `PUENTE_CLAVE`. El microcontrolador se
 * autentica contra Mosquitto, con su usuario y su clave MQTT, que es otra capa
 * y otro problema. Ver `lib/telemetria/puente.ts`.
 *
 * El puente todavía no está escrito, y esta ruta no lo espera: el contrato es
 * HTTP y cualquier cosa que hable HTTP lo cumple. Simularlo desde Postman es
 * exactamente probar esto de punta a punta.
 *
 *     POST /api/reportes
 *     Authorization: Bearer <PUENTE_CLAVE>
 *
 *     { "serial": "TVL-0001",
 *       "medidoEn": "2026-09-06T14:32:10Z",
 *       "lecturas": { "tension-de-barra": 398.4 } }
 *
 * Las claves de `lecturas` son las que el padrón deriva del rótulo cuando se
 * declara una magnitud, y que la pantalla muestra abajo del borne al cargarla.
 * Se comparan tal cual, sin volver a pasarlas por `aClave`: la clave es el
 * contrato entre el firmware y el padrón, y una comparación indulgente haría
 * que «funciona» dependa de una normalización que el autor del firmware no
 * puede ver — y que, con un guión bajo de por medio, podría atribuirle la
 * lectura a la magnitud equivocada.
 *
 * ── Las decisiones que gobiernan este handler ──────────────────────────────
 *
 * **Serial desconocido: 404 y no se guarda nada.** El padrón es la fuente de
 * verdad. Una lectura de un equipo que nadie declaró no tiene dueño, no tiene
 * empresa y no tiene unidad: guardarla sería fabricar una fila que ninguna
 * pantalla podría mostrar y que nadie podría atribuir. El primer principio del
 * producto es que toda lectura se rastrea hasta el aparato que la reportó.
 *
 * **Clave no declarada: se ignora esa clave y el resto entra.** Un firmware que
 * reporta un campo de más no debería costarle al buque las otras siete lecturas
 * del mismo mensaje. Lo ignorado vuelve en la respuesta, con el motivo, para
 * que el puente lo pueda registrar: es la única manera de que alguien se entere
 * de que un equipo viene diciendo algo que nadie está escuchando.
 *
 * **Un equipo fuera de servicio que reporta: se guarda igual.** El fierro está
 * hablando y negarlo no lo hace callar; perder esas lecturas sería además
 * perder justo las del equipo que alguien está por revisar. Lo que cambia es
 * dónde se ve: la pantalla lo sigue mostrando abajo, entre los que están fuera
 * de servicio, y no entre los activos. La respuesta trae `enServicio: false`
 * para que el puente lo pueda anotar — un equipo dado de baja hace un mes que
 * sigue reportando es un dato sobre la instalación, no sobre el software.
 *
 * **El umbral no se evalúa acá.** Guardar una lectura y disparar una alerta son
 * dos actos, y por qué medio sale una alerta sigue sin decidirse en PRODUCT.md.
 * Este handler no compara contra `min` y `max` ni deja nada preparado para
 * hacerlo: inventar acá un canal de notificación sería contestar de taquito lo
 * que el documento dejó abierto a propósito.
 *
 * Sin freno de intentos, a diferencia del acceso: acá no hay ningún secreto que
 * se pueda adivinar repitiendo —la clave se compara entera y en tiempo
 * constante— y frenar al puente por reintentar rompería justo el caso para el
 * que se eligió la clave primaria de `measurements`.
 */

type Cuerpo = { serial?: unknown; medidoEn?: unknown; lecturas?: unknown };

/** Por qué una clave que vino en el mensaje no se guardó. */
type Ignorada = {
  clave: string;
  motivo: 'no-declarada' | 'dada-de-baja' | 'valor-no-numerico';
};

export async function POST(pedido: Request) {
  const puerta = autenticaPuente(pedido.headers);

  if (puerta === 'no-configurado') {
    /* No es culpa de quien llama, así que no es un 401: es este servidor sin
       `PUENTE_CLAVE`. Contestarle 401 al operador del puente lo mandaría a
       revisar su propia clave durante una hora. */
    console.error('[reportes] falta PUENTE_CLAVE, o es más corta que el mínimo.');
    return error('puente', 'Este servidor todavía no tiene configurada la ingesta.', 503);
  }

  if (puerta !== 'ok') {
    return error('credencial', 'Falta la credencial del puente, o no es la de este servidor.', 401);
  }

  const leido = await cuerpoDe<Cuerpo>(pedido);
  if (!leido.ok) return leido.respuesta;

  const serial = normalizarSerial(texto(leido.cuerpo.serial));
  if (!serial) return error('faltan', 'Falta el serial del equipo que reporta.', 400);

  /* La forma se valida antes de ir a la base: un serial con un espacio adentro
     no puede estar declarado, y no hace falta una consulta para saberlo. */
  if (!esSerial(serial)) {
    return error('serial', 'Ese serial no tiene forma de serial.', 400);
  }

  const medidoEn = aInstante(leido.cuerpo.medidoEn);
  if (!medidoEn) {
    return error(
      'medido-en',
      'Falta «medidoEn», o no es una fecha ISO 8601 con huso horario: «2026-09-06T14:32:10Z».',
      400,
    );
  }

  /* Un reloj adelantado no da un dato raro: da un dato que se queda para
     siempre arriba de todos los demás, porque «la última» se decide por
     `medidoEn`. Hacia atrás no hay límite, que es el caso normal de este
     producto: un buque descarga quince días juntos al volver a rango. */
  if (medidoEn.getTime() - Date.now() > ADELANTO_TOLERADO_MS) {
    return error(
      'reloj',
      'Esa medición está fechada en el futuro. Revisá el reloj del equipo o el del puente.',
      400,
    );
  }

  const lecturas = leido.cuerpo.lecturas;
  if (typeof lecturas !== 'object' || lecturas === null || Array.isArray(lecturas)) {
    return error('lecturas', 'Falta «lecturas», que es un objeto de clave a valor.', 400);
  }

  const claves = Object.keys(lecturas);
  if (!claves.length) {
    return error('lecturas', 'Un reporte sin ninguna lectura no es un reporte.', 400);
  }

  const equipo = await dispositivoQueReporta(serial);

  /* La única salida que no guarda nada. Se dice cuál es el problema, sin
     rodeos: el que pregunta es el puente y ya presentó la credencial de
     servicio, así que no hay a quién ocultarle que ese serial no está
     declarado — al contrario, es lo único que le sirve para avisarle a alguien
     que hay un equipo instalado y sin dar de alta. */
  if (!equipo) {
    return error(
      'serial-desconocido',
      `Ningún dispositivo declarado tiene el serial ${serial}. Hay que darlo de alta en el padrón antes de que pueda reportar.`,
      404,
    );
  }

  const porClave = new Map(equipo.magnitudes.map((m) => [m.clave, m]));
  const valores = lecturas as Record<string, unknown>;

  /* Cada fila lleva la clave con la que vino, porque el puente habla el idioma
     del mensaje que mandó y no el de los identificadores internos de esta
     base: la respuesta tiene que contestarle con sus propias palabras. */
  const aGuardar: { magnitud: string; valor: number; clave: string }[] = [];
  const ignoradas: Ignorada[] = [];

  for (const clave of claves) {
    const magnitud = porClave.get(clave);

    if (!magnitud) {
      ignoradas.push({ clave, motivo: 'no-declarada' });
      continue;
    }

    if (!magnitud.activa) {
      /* Distinta de la anterior a propósito: ésta es una magnitud que alguien
         retiró del padrón, no una que nunca existió. Su historia queda —por eso
         la baja es blanda— pero deja de aceptar lecturas nuevas, porque se
         decidió que eso ya no es parte de lo que este equipo mide. */
      ignoradas.push({ clave, motivo: 'dada-de-baja' });
      continue;
    }

    const valor = aValor(valores[clave]);
    if (valor === undefined) {
      ignoradas.push({ clave, motivo: 'valor-no-numerico' });
      continue;
    }

    aGuardar.push({ magnitud: magnitud.id, valor, clave });
  }

  const puestas = await guardarLote(medidoEn, aGuardar);
  const entraron = new Set(puestas.map((p) => p.magnitud));

  /* Guardada es la que entró; repetida es la que ya estaba con ese mismo
     instante, o sea el reintento del puente. Son dos renglones y no uno porque
     para el puente son dos cosas distintas: sin `repetidas`, un reintento ve
     «guardadas: []» y lo registra como una pérdida cuando fue un éxito. */
  const guardadas: string[] = [];
  const repetidas: string[] = [];
  for (const fila of aGuardar) {
    (entraron.has(fila.magnitud) ? guardadas : repetidas).push(fila.clave);
  }

  return listo({
    serial,
    dispositivo: equipo.rotulo,
    enServicio: equipo.activo,
    medidoEn: medidoEn.toISOString(),
    /* La marca del servidor, tal como quedó escrita en la fila: la pone la base
       con su `DEFAULT` y ésta es la que volvió. No se calcula acá, y sin filas
       nuevas no hay ninguna que informar — no se inventa una. */
    recibidoEn: puestas[0]?.recibidoEn ?? null,
    guardadas,
    repetidas,
    ignoradas,
  });
}
