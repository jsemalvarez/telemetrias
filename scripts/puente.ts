/**
 * El puente MQTT→REST.
 *
 *     microcontrolador --MQTT--> Mosquitto --MQTT--> ACÁ --REST--> la app
 *
 * Es el proceso del medio, y existe porque **Mosquitto no habla HTTP**: es un
 * broker MQTT puro, sin webhooks ni motor de reglas, a diferencia de EMQX o
 * HiveMQ. Alguien tiene que suscribirse a los tópicos y hacer el pedido, y ese
 * alguien es esto.
 *
 *     npm run puente
 *
 * Hace exactamente los mismos POST que `scripts/simular-puente.ts` viene
 * haciendo desde que existe la ingesta. Ése no habla MQTT y mueve una perilla
 * inventada para poder ver el panel sin el fierro delante; éste no inventa nada
 * y sólo traduce. El contrato con la aplicación es el mismo, y por eso el
 * simulador sigue sirviendo: es la única forma de mover el panel sin broker.
 *
 * ── Lo que este proceso decide ────────────────────────────────────────────
 *
 * **Agrupa por equipo.** Un mensaje MQTT por magnitud no puede ser un POST por
 * magnitud. Todo lo que un equipo midió en un instante tiene que llegar con UNA
 * marca de tiempo, porque la marca la pone este proceso —el ESP32 no tiene
 * reloj— y tres POST seguidos serían tres instantes con milisegundos de
 * diferencia. En el panel eso se ve: las tres agujas de un tablero quedarían con
 * edades distintas, y una de ellas siempre sería «la más vieja» sin que haya
 * pasado nada. Así que lo que llega abajo de un mismo serial se junta durante
 * una ventana corta y sale junto.
 *
 * La ventana es fija y arranca con el primer mensaje del grupo; no se estira con
 * cada mensaje nuevo. Estirarla haría que un equipo hablador postergue su propio
 * reporte para siempre, y con él la marca de tiempo que ya se le puso.
 *
 * **Sella el instante cuando llega el primer mensaje del grupo, y no al
 * despachar.** Es lo más cerca del momento en que el equipo midió que este
 * proceso puede estar, y hace que la ventana no le agregue edad al dato.
 *
 * **La marca la pone el puente, siempre.** Un microcontrolador sin reloj de
 * tiempo real no sabe qué hora es, así que quien sella es el primero de la
 * cadena que sí lo sabe. Un equipo que algún día traiga reloj propio es un
 * cambio acá adentro y en ningún otro lado — pero mientras no lo traiga,
 * creerle una fecha que no puede saber sería fechar todo el parque en 1970.
 *
 * **Un reintento no duplica.** El mismo `medidoEn` viaja en cada intento, y la
 * identidad de una medición es su magnitud y su instante: el reintento choca
 * contra la clave primaria y vuelve como `repetidas`. Eso es lo que permite
 * reintentar sin pensarlo, y está escrito en `prisma/schema.prisma`.
 *
 * **No valida nada que la aplicación ya valide.** Una clave que ningún padrón
 * declaró, un valor que no es un número, un equipo fuera de servicio: todo eso
 * se manda igual y la respuesta dice qué pasó. Repetir esos criterios acá sería
 * tener dos jueces que algún día no van a coincidir, y el que importa es el que
 * escribe en la base. Lo que sí hace este proceso es **registrar** lo que la
 * respuesta le contesta: es la única forma de que alguien se entere de que un
 * equipo viene diciendo algo que nadie está escuchando.
 *
 * ── Las dos credenciales, que son de dos capas distintas ──────────────────
 *
 *   MQTT_USUARIO / MQTT_CLAVE   contra el broker. Sólo lee, no publica.
 *   PUENTE_CLAVE                contra la aplicación. Sólo escribe, no lee.
 *
 * Son espejo una de la otra a propósito. Ver `lib/telemetria/puente.ts` y
 * `mosquitto/acl`.
 *
 * ── Qué se pierde y qué no ────────────────────────────────────────────────
 *
 * Se conecta con sesión persistente y QoS 1, así que **lo que un equipo
 * publicó mientras este proceso no estaba lo guarda el broker** y se lo entrega
 * al volver.
 *
 * Con una condición que no está de este lado y por eso hay que decirla:
 * **el equipo tiene que publicar con QoS 1.** Un mensaje QoS 0 no se encola
 * para un suscriptor ausente —así está el protocolo— y se pierde sin dejar
 * rastro en ningún registro. Comprobado contra Mosquitto con este puente
 * apagado: el QoS 1 llegó al reconectar y el QoS 0 no llegó nunca.
 *
 * Lo que sí se pierde de este lado es lo que estaba en la ventana en el momento
 * de una caída, y lo que no entró después de todos los reintentos: eso se dice
 * en el registro con todas las letras y no se esconde detrás de un «error».
 *
 * Un solo puente por broker: el identificador de cliente es fijo, que es lo que
 * hace que la sesión persistente sea la misma entre arranques. Dos procesos con
 * el mismo identificador se echan mutuamente en un bucle.
 *
 * Opciones: `--broker`, `--url`, `--ventana` en milisegundos. Todo lo que hace
 * falta sale también del entorno, porque donde esto va a correr de verdad no hay
 * nadie escribiendo una línea de comandos.
 */

import { connect } from 'mqtt';
import { aValor } from '../lib/telemetria/reglas';
import { SUSCRIPCIONES, USUARIO_PUENTE, leerTopico, type Origen } from '../lib/telemetria/topicos';
import { delEntorno } from './entorno';

/* -------------------------------- Los números -------------------------------- */

/**
 * Cuánto se espera para juntar lo que un equipo dijo en el mismo instante.
 *
 * Un cuarto de segundo: de sobra para que entren los mensajes de un equipo que
 * publica sus magnitudes una tras otra, y poco para que el dato no se quede
 * esperando. Y no le agrega edad de todos modos, porque el instante ya quedó
 * sellado con el primer mensaje del grupo.
 */
const VENTANA_MS = 250;

/** Cuántas veces se reintenta un reporte que no entró, antes de darlo por perdido. */
const REINTENTOS = 5;

/** La primera espera; después se duplica. 1, 2, 4, 8 y 16 segundos. */
const ESPERA_BASE_MS = 1000;

/**
 * El identificador con el que este proceso se presenta al broker.
 *
 * Fijo y no aleatorio: es lo que le permite al broker reconocer la sesión de la
 * corrida anterior y entregarle lo que quedó encolado mientras no estaba.
 */
const ID_CLIENTE = 'tecvol-puente';

const USO = `
Uso:  npm run puente

Sale todo del entorno (.env.local):

  MQTT_URL        dónde está el broker           (mqtt://localhost:1883)
  MQTT_USUARIO    con qué usuario se conecta     (${USUARIO_PUENTE})
  MQTT_CLAVE      su contraseña MQTT             npm run mqtt:credencial -- --puente
  PUENTE_DESTINO  a qué aplicación reporta       (http://localhost:3000)
  PUENTE_CLAVE    la credencial de servicio      documentada en .env.example

Opciones:
  --broker <URL>    dónde está el broker
  --url <URL>       a qué aplicación reportar
  --ventana <ms>    cuánto se junta antes de postear (${VENTANA_MS})
`;

/* ------------------------------ Los argumentos ------------------------------ */

function leerOpciones(argv: string[]) {
  const opciones = {
    broker: delEntorno('MQTT_URL') ?? 'mqtt://localhost:1883',
    usuario: delEntorno('MQTT_USUARIO') ?? USUARIO_PUENTE,
    claveMqtt: delEntorno('MQTT_CLAVE') ?? '',
    url: (delEntorno('PUENTE_DESTINO') ?? 'http://localhost:3000').replace(/\/+$/, ''),
    clave: delEntorno('PUENTE_CLAVE') ?? '',
    ventana: VENTANA_MS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--broker') {
      opciones.broker = argv[++i] ?? '';
      continue;
    }
    if (arg === '--url') {
      opciones.url = (argv[++i] ?? '').replace(/\/+$/, '');
      continue;
    }
    if (arg === '--ventana') {
      const numero = Number(argv[++i]);
      if (!Number.isFinite(numero) || numero < 0) {
        throw new Error('--ventana tiene que ser un número de milisegundos.');
      }
      opciones.ventana = numero;
      continue;
    }
    throw new Error(`No conozco la opción ${arg}.`);
  }

  if (!opciones.claveMqtt) {
    throw new Error(
      'Falta MQTT_CLAVE, que es la contraseña de este proceso contra el broker.\n' +
        '  Creala con:  npm run mqtt:credencial -- --puente',
    );
  }
  if (!opciones.clave) {
    throw new Error('Falta PUENTE_CLAVE. Va en .env.local; está documentada en .env.example.');
  }

  return opciones;
}

function arrancar() {
  try {
    return leerOpciones(process.argv.slice(2));
  } catch (falla: unknown) {
    console.error(`\n  ${falla instanceof Error ? falla.message : String(falla)}`);
    console.error(USO);
    process.exit(1);
  }
}

const opciones = arrancar();

/* -------------------------------- El registro -------------------------------- */

const hora = () => new Date().toTimeString().slice(0, 8);

const anotar = (texto: string) => console.log(`${hora()}  ${texto}`);

/**
 * Los avisos que sólo tienen sentido una vez.
 *
 * Un firmware que reporta una clave de más la reporta cada segundo, y un equipo
 * sin declarar publica cada segundo también. Escribir eso en cada vuelta llena
 * la pantalla y esconde todo lo demás — que es la forma más segura de que nadie
 * lo lea. Se dice una vez por corrida, entero, y se calla.
 */
const dichos = new Set<string>();

function anotarUnaVez(marca: string, texto: string) {
  if (dichos.has(marca)) return;
  dichos.add(marca);
  anotar(texto);
}

/** Un cuerpo ajeno, recortado para que quepa en un renglón del registro. */
const recortar = (texto: string) => (texto.length > 60 ? `${texto.slice(0, 57)}…` : texto);

/* ------------------------------ Leer el mensaje ------------------------------ */

/** Lo que un equipo dijo: clave de magnitud a valor, tal como va a viajar. */
type Lecturas = Record<string, unknown>;

function comoObjeto(texto: string): Record<string, unknown> | null {
  try {
    const leido: unknown = JSON.parse(texto);
    return typeof leido === 'object' && leido !== null && !Array.isArray(leido)
      ? (leido as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Del mensaje que llegó a las lecturas que van adentro del POST.
 *
 * Los valores que no son un número **se pasan igual**, sin convertirlos y sin
 * descartarlos. La aplicación los devuelve en `ignoradas` con el motivo
 * `valor-no-numerico`, y ése es el lugar donde ese diagnóstico tiene que
 * aparecer: uno solo, el mismo para el firmware que manda texto y para el que
 * manda una clave que nadie declaró. Un puente que filtrara por su cuenta
 * dejaría al equipo callado sin que nadie sepa por qué.
 */
function lecturasDe(origen: Origen, carga: Buffer): Lecturas {
  const texto = carga.toString('utf8').trim();

  if (origen.clave) {
    /* Un tópico por magnitud: el cuerpo es el número pelado, que es lo que sale
       de un `mosquitto_pub -m 62.5` y de casi cualquier ejemplo de ESP32. Se
       acepta también `{"valor": 62.5}`, que es la otra forma que aparece sola.
       Si no es ninguna de las dos, viaja el texto tal cual y contesta la app. */
    const objeto = comoObjeto(texto);
    const valor = objeto ? objeto.valor : aValor(texto);
    return { [origen.clave]: valor ?? texto };
  }

  const objeto = comoObjeto(texto);
  if (!objeto) throw new Error(`«${recortar(texto)}» no es un objeto JSON`);

  /* Se acepta el objeto pelado —`{"tension-de-barra": 398.4}`— y también uno con
     las lecturas adentro de `lecturas`, que es la forma del cuerpo del POST y la
     que copia quien mira el endpoint antes de escribir el firmware. */
  const adentro = objeto.lecturas;
  const crudas =
    typeof adentro === 'object' && adentro !== null && !Array.isArray(adentro)
      ? (adentro as Record<string, unknown>)
      : objeto;

  if (!Object.keys(crudas).length) throw new Error('el mensaje no trae ninguna lectura');
  return crudas;
}

/* --------------------------- Juntar lo de un equipo --------------------------- */

type Grupo = {
  lecturas: Lecturas;
  /** Sellado al llegar el primer mensaje del grupo, y el mismo en cada reintento. */
  medidoEn: string;
  reloj: NodeJS.Timeout;
};

const pendientes = new Map<string, Grupo>();

/** Los reportes que están saliendo, para poder esperarlos al cerrar. */
const enVuelo = new Set<Promise<void>>();

let cerrando = false;

function juntar(serial: string, lecturas: Lecturas) {
  let grupo = pendientes.get(serial);

  if (!grupo) {
    grupo = {
      lecturas: {},
      medidoEn: new Date().toISOString(),
      reloj: setTimeout(() => despachar(serial), opciones.ventana),
    };
    pendientes.set(serial, grupo);
  }

  /* La última gana: si un equipo repitió una magnitud adentro de la misma
     ventana, la segunda es más nueva que la primera. */
  Object.assign(grupo.lecturas, lecturas);
}

function despachar(serial: string) {
  const grupo = pendientes.get(serial);
  if (!grupo) return;

  clearTimeout(grupo.reloj);
  pendientes.delete(serial);

  const saliendo = reportar(serial, grupo);
  enVuelo.add(saliendo);
  void saliendo.finally(() => enVuelo.delete(saliendo));
}

/* --------------------------------- Reportar --------------------------------- */

const dormir = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

/**
 * Un intento de POST, y qué hacer con lo que contestó.
 *
 * `reintentar` es sólo para lo que puede mejorar solo: un enlace caído, la
 * aplicación reiniciándose, un 5xx —incluido el 503 de una aplicación a la que
 * todavía no le configuraron la ingesta—. Un 404 o un 400 no mejoran
 * repitiéndolos: se dicen una vez y se sueltan.
 */
async function intentar(
  serial: string,
  grupo: Grupo,
  etiqueta: string,
): Promise<'listo' | 'reintentar'> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${opciones.url}/api/reportes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opciones.clave}` },
      body: JSON.stringify({ serial, medidoEn: grupo.medidoEn, lecturas: grupo.lecturas }),
    });
  } catch (falla) {
    anotar(`${etiqueta}  — sin enlace con ${opciones.url} (${(falla as Error).message})`);
    return 'reintentar';
  }

  const cuerpo = await respuesta.json().catch(() => null);

  if (respuesta.status === 401) {
    /* No mejora reintentando ni esperando: la clave está mal y hay que
       corregirla. Cortar acá no pierde nada que no se estuviera perdiendo ya —
       con sesión persistente, lo que se publique mientras tanto lo guarda el
       broker y entra cuando este proceso vuelva bien configurado. */
    console.error('\n  La aplicación no acepta PUENTE_CLAVE. Revisá .env.local.\n');
    cerrar(1);
    return 'listo';
  }

  if (respuesta.status === 404) {
    anotarUnaVez(
      `desconocido:${serial}`,
      `${serial}  — NO ESTÁ DECLARADO: viene publicando y nadie lo dio de alta en el padrón. ` +
        'No se vuelve a avisar hasta el próximo arranque.',
    );
    return 'listo';
  }

  if (respuesta.status >= 500) {
    anotar(`${etiqueta}  — ${respuesta.status}: ${cuerpo?.mensaje ?? 'sin detalle'}`);
    return 'reintentar';
  }

  if (!respuesta.ok) {
    /* 400: el mensaje está mal armado, y eso es el firmware o este proceso. */
    anotarUnaVez(
      `rechazado:${serial}:${respuesta.status}`,
      `${etiqueta}  — ${respuesta.status}: ${cuerpo?.mensaje ?? 'sin detalle'}`,
    );
    return 'listo';
  }

  /* Se registra lo que contestó y no un «ok»: una clave mal escrita vuelve con
     200 y la lectura adentro de `ignoradas`, y sin esto alguien puede estar
     media hora mirando una aguja quieta sin saber por qué. */
  for (const ignorada of cuerpo?.ignoradas ?? []) {
    anotarUnaVez(
      `ignorada:${serial}:${ignorada.clave}:${ignorada.motivo}`,
      `${serial}  «${ignorada.clave}» IGNORADA (${ignorada.motivo}): el equipo la viene ` +
        'reportando y nadie la escucha. No se vuelve a avisar hasta el próximo arranque.',
    );
  }

  if (cuerpo?.enServicio === false) {
    anotarUnaVez(
      `debaja:${serial}`,
      `${serial}  — sigue reportando y está fuera de servicio en el padrón. Se guarda igual.`,
    );
  }

  if (cuerpo?.guardadas?.length) anotar(`${etiqueta}  guardada`);
  else if (cuerpo?.repetidas?.length) anotar(`${etiqueta}  repetida`);

  return 'listo';
}

async function reportar(serial: string, grupo: Grupo): Promise<void> {
  const etiqueta = `${serial}  ${Object.entries(grupo.lecturas)
    .map(([clave, valor]) => `${clave}=${valor}`)
    .join('  ')}`;

  for (let intento = 1; ; intento += 1) {
    if ((await intentar(serial, grupo, etiqueta)) === 'listo') return;

    /* Cerrando no se reintenta: si no entró recién, no va a entrar en los
       treinta segundos que nadie va a esperar con Ctrl+C apretado. */
    if (cerrando || intento >= REINTENTOS) {
      anotar(`${etiqueta}  — PERDIDA después de ${intento} intento(s)`);
      return;
    }

    const espera = ESPERA_BASE_MS * 2 ** (intento - 1);
    anotar(`${etiqueta}  — reintento ${intento + 1} de ${REINTENTOS} en ${espera / 1000} s`);
    await dormir(espera);
  }
}

/* --------------------------------- El broker --------------------------------- */

console.log(`Puente  ${opciones.broker}  →  ${opciones.url}`);
console.log(`Usuario ${opciones.usuario}, agrupando por equipo cada ${opciones.ventana} ms.`);
console.log(`Escucha ${SUSCRIPCIONES.join('  y  ')}`);
console.log('\nCtrl+C para cortar.\n');

const cliente = connect(opciones.broker, {
  clientId: ID_CLIENTE,
  username: opciones.usuario,
  password: opciones.claveMqtt,
  /* Sesión persistente: lo que llegue mientras este proceso no esté lo guarda el
     broker y se lo entrega al volver. Es la mitad del «quedarse sin señal es un
     estado normal» que este producto se toma en serio. */
  clean: false,
  reconnectPeriod: 2000,
  connectTimeout: 10_000,
});

cliente.on('connect', (bienvenida) => {
  anotar(
    `conectado al broker${bienvenida?.sessionPresent ? ', con la sesión de la corrida anterior' : ''}`,
  );

  /* Se suscribe en cada conexión, incluso con la sesión ya presente: repetir una
     suscripción que ya existe no cuesta nada, y no repetirla el día que la
     sesión se haya perdido es un puente conectado y mudo. */
  cliente.subscribe(SUSCRIPCIONES, { qos: 1 }, (falla, otorgadas) => {
    if (falla) {
      console.error(`  No se pudo suscribir: ${falla.message}`);
      return;
    }
    /* Mosquitto contesta 128 cuando el ACL no deja escuchar un tópico, y lo hace
       sin cerrar la conexión: sin esta línea el puente queda prendido y mudo,
       que es la falla más difícil de diagnosticar de todas. */
    const negadas = (otorgadas ?? []).filter((s) => s.qos > 2);
    if (negadas.length) {
      console.error(
        `  El broker NEGÓ estas suscripciones: ${negadas.map((s) => s.topic).join(', ')}\n` +
          `  Revisá que mosquitto/acl le dé lectura al usuario «${opciones.usuario}».`,
      );
    }
  });
});

cliente.on('message', (topico, carga) => {
  const origen = leerTopico(topico);
  if (!origen) {
    anotarUnaVez(`topico:${topico}`, `tópico que no se sabe leer, ignorado: ${topico}`);
    return;
  }

  let lecturas: Lecturas;
  try {
    lecturas = lecturasDe(origen, carga);
  } catch (falla) {
    anotarUnaVez(
      `carga:${topico}`,
      `${topico}  — no se pudo leer el mensaje: ${(falla as Error).message}`,
    );
    return;
  }

  juntar(origen.serial, lecturas);
});

/* Perder el enlace es un estado y no un error, acá también: se dice y se sigue.
   La biblioteca reconecta sola cada `reconnectPeriod`. */
cliente.on('offline', () => anotar('sin enlace con el broker; reintentando'));
cliente.on('reconnect', () => anotar('reconectando al broker'));

cliente.on('error', (falla: Error & { code?: number }) => {
  /* 4 y 5 son «credenciales rechazadas» y «no autorizado» del CONNACK. No
     mejoran reintentando cada dos segundos para siempre. */
  if (falla.code === 4 || falla.code === 5) {
    console.error(
      `\n  El broker rechazó la credencial de «${opciones.usuario}».\n` +
        '  Creala o rotala con:  npm run mqtt:credencial -- --puente\n',
    );
    cerrar(1);
    return;
  }
  anotar(`broker: ${falla.message}`);
});

/* --------------------------------- Cerrar --------------------------------- */

/**
 * Lo que está juntándose sale ahora.
 *
 * Sin esto, un Ctrl+C en el momento equivocado tira la ventana entera — un
 * cuarto de segundo de lecturas de todo el parque. Cuestan lo que tarda un POST
 * y no hay ninguna razón para perderlas.
 */
function cerrar(codigo = 0) {
  if (cerrando) return;
  cerrando = true;

  /* `Array.from` y no un spread: sin `target` en tsconfig, `tsc` compila a ES5
     y no sabe recorrer un Map. */
  for (const serial of Array.from(pendientes.keys())) despachar(serial);

  void Promise.allSettled(Array.from(enVuelo)).then(() => {
    cliente.end(false, () => process.exit(codigo));
  });

  /* Y un techo, por si algo queda colgado: cerrar tiene que terminar. */
  setTimeout(() => process.exit(codigo), 5000).unref();
}

process.on('SIGINT', () => cerrar(0));
process.on('SIGTERM', () => cerrar(0));
