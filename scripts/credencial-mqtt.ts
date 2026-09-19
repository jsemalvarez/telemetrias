/**
 * Las credenciales MQTT: una por equipo, y la del puente.
 *
 *   npm run mqtt:credencial -- TVL-0001         crea la de un equipo, o la rota
 *   npm run mqtt:credencial -- --puente         crea la del proceso puente
 *   npm run mqtt:credencial -- --listar         qué credenciales existen hoy
 *   npm run mqtt:credencial -- --baja TVL-0001  se la saca
 *
 * **Una por dispositivo, y no una compartida.** Contra la aplicación se
 * autentica el puente con una sola credencial de servicio —eso está decidido y
 * escrito en PRODUCT.md, y trae consigo que esa clave puede reportar en nombre
 * de cualquier serial declarado—. Contra el broker es al revés: cada equipo
 * tiene la suya, y el ACL de Mosquitto sólo lo deja publicar abajo de su propio
 * serial. Es la capa que hace que un fierro no pueda hablar por otro, y la
 * única que puede darla: cuando el mensaje llega al puente, ya perdió la única
 * prueba de quién lo mandó.
 *
 * **El usuario MQTT de un equipo ES su serial.** Por eso no hay un padrón de
 * usuarios que mantener al lado del padrón de dispositivos: el ACL dice
 * `tecvol/%u/lecturas` y con eso alcanza para doscientos equipos. Es la misma
 * decisión que ya está escrita sobre la columna `serial` —el tópico se deriva,
 * no se guarda— llevada un paso más.
 *
 * **La contraseña se muestra una vez y no se puede recuperar.** El archivo
 * guarda un hash, como corresponde. Se puede rotar, que es lo que hace este
 * mismo comando corrido de nuevo sobre un serial que ya tiene credencial: el
 * equipo queda afuera hasta que se le cargue la nueva.
 *
 * ── Por qué esto habla con Docker y no con la base ────────────────────────
 *
 * No consulta el padrón, a propósito, y no chequea que el serial esté dado de
 * alta. Son dos actos separados en el tiempo y en las manos: alguien flashea un
 * microcontrolador en el taller y alguien lo declara en la aplicación, y el
 * orden no está fijado. Un equipo con credencial y sin declarar no queda en
 * silencio — publica, el puente postea y la aplicación contesta 404 diciendo
 * exactamente eso, que es donde ese descubrimiento tiene que aparecer.
 *
 * Lo que sí exige es que el broker esté levantado: `mosquitto_passwd` vive
 * adentro del contenedor y es la única forma de escribir ese archivo sin
 * reimplementar el formato de hash de Mosquitto. Reimplementarlo sería fabricar
 * el día en que los dos dejen de coincidir y ningún equipo pueda conectarse —
 * la misma razón por la que `crear-admin` hashea con la función de la
 * aplicación y no con una propia.
 */

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { esSerial, normalizarSerial } from '../lib/dispositivos/reglas';
import { USUARIO_PUENTE, topicoDe, topicoDeMagnitud } from '../lib/telemetria/topicos';

/** Dónde vive el archivo de contraseñas, adentro del contenedor. */
const PASSWD = '/mosquitto/config/passwd';

/** El servicio, tal como se llama en docker-compose.yml. */
const SERVICIO = 'mosquitto';

const USO = `
Uso:  npm run mqtt:credencial -- SERIAL           crea la credencial de un equipo, o la rota
      npm run mqtt:credencial -- --puente         crea la del proceso puente
      npm run mqtt:credencial -- --listar         qué credenciales existen
      npm run mqtt:credencial -- --baja SERIAL    se la saca

El broker tiene que estar levantado:  docker compose up -d
`;

/* ------------------------------ El contenedor ------------------------------ */

/**
 * Corre un guion adentro del contenedor del broker, como el usuario
 * `mosquitto`.
 *
 * Como `mosquitto` y no como root porque `mosquitto_passwd` reescribe el
 * archivo entero, y el nuevo queda del dueño que lo corrió: hecho como root, el
 * broker —que ya soltó privilegios— deja de poder leer sus propias contraseñas
 * en la próxima recarga.
 *
 * Lo que va por `entrada` llega por la entrada estándar y no como argumento. La
 * razón es la misma que ya está escrita en `.env.example` sobre el alta de
 * administradores: los argumentos de un proceso los lee cualquiera que liste
 * los procesos de la máquina, y `docker compose exec …` es un proceso de esta
 * máquina.
 */
function enElBroker(guion: string, argumentos: string[] = [], entrada = ''): string {
  const corrida = spawnSync(
    'docker',
    ['compose', 'exec', '-T', '-u', 'mosquitto', SERVICIO, 'sh', '-c', guion, '_', ...argumentos],
    { input: entrada, encoding: 'utf8' },
  );

  if (corrida.error) {
    throw new Error(
      `No se pudo correr docker: ${corrida.error.message}\n  ¿Está instalado y en el PATH?`,
    );
  }
  if (corrida.status !== 0) {
    const detalle = `${corrida.stderr ?? ''}${corrida.stdout ?? ''}`.trim();
    /* El error más frecuente de todos, y el que peor se lee tal como viene. */
    if (/is not running|no such service|not found/i.test(detalle)) {
      throw new Error('El broker no está levantado. Arrancalo con:  docker compose up -d');
    }
    throw new Error(detalle || `docker compose exec terminó con estado ${corrida.status}.`);
  }
  return (corrida.stdout ?? '').trim();
}

/**
 * Le avisa al broker que vuelva a leer el archivo de contraseñas.
 *
 * SIGHUP y no un reinicio: reiniciar corta todas las conexiones abiertas, y en
 * un parque con enlace malo cada reconexión cuesta. Esto recarga contraseñas y
 * ACL; los dos archivos de `mosquitto/` se copian al arrancar el contenedor,
 * así que un cambio ahí sí pide `docker compose restart mosquitto`.
 */
function recargar(): void {
  const corrida = spawnSync('docker', ['compose', 'kill', '-s', 'HUP', SERVICIO], {
    encoding: 'utf8',
  });
  if (corrida.status !== 0) {
    console.log('  (no se pudo recargar el broker; la va a tomar cuando se lo reinicie)');
  }
}

/* ----------------------------- Las operaciones ----------------------------- */

/**
 * Una contraseña que nadie eligió.
 *
 * 24 caracteres de base64url: sin comillas, sin barras y sin acentos, así se
 * pega tal cual adentro del firmware, de un `.env` o de una línea de
 * `mosquitto_pub`, sin escapar nada.
 */
const contrasena = () => randomBytes(18).toString('base64url');

function alta(usuario: string, clave: string): void {
  /* `$1` es el usuario; la clave entra por la entrada estándar y `read -r` la
     toma sin interpretar barras invertidas. */
  enElBroker(`read -r clave; mosquitto_passwd -b ${PASSWD} "$1" "$clave"`, [usuario], `${clave}\n`);
  recargar();
}

function baja(usuario: string): void {
  if (!listar().includes(usuario)) {
    throw new Error(`No hay ninguna credencial a nombre de ${usuario}.`);
  }
  enElBroker(`mosquitto_passwd -D ${PASSWD} "$1"`, [usuario]);
  recargar();
}

function listar(): string[] {
  /* El archivo es `usuario:hash` por línea. Se leen los usuarios y nada más:
     imprimir un hash no le sirve a nadie y ensucia la terminal de quien mira. */
  const salida = enElBroker(`cut -d: -f1 ${PASSWD} 2>/dev/null || true`);
  return salida.split(/\r?\n/).filter(Boolean);
}

/* --------------------------------- Correr --------------------------------- */

function main(): void {
  const argv = process.argv.slice(2);
  if (!argv.length) throw new Error('Falta decir de qué equipo.');

  if (argv[0] === '--listar') {
    const usuarios = listar();
    if (!usuarios.length) {
      console.log('\n  No hay ninguna credencial cargada: nadie puede conectarse al broker.\n');
      return;
    }
    console.log(`\n  ${usuarios.length} credencial(es) en el broker:\n`);
    for (const usuario of usuarios) {
      console.log(`    ${usuario}${usuario === USUARIO_PUENTE ? '   (el proceso puente)' : ''}`);
    }
    console.log('');
    return;
  }

  if (argv[0] === '--baja') {
    const pedido = argv[1];
    if (!pedido) throw new Error('Falta decir a quién darle de baja.');
    const usuario = pedido === '--puente' ? USUARIO_PUENTE : normalizarSerial(pedido);
    baja(usuario);
    console.log(`\n  ${usuario} ya no puede conectarse al broker.\n`);
    return;
  }

  const esPuente = argv[0] === '--puente';
  const usuario = esPuente ? USUARIO_PUENTE : normalizarSerial(argv[0]);

  if (!esPuente && !esSerial(usuario)) {
    throw new Error(
      `«${argv[0]}» no tiene forma de serial: letras, números, guiones, puntos y dos puntos, sin espacios.`,
    );
  }

  const rotada = listar().includes(usuario);
  const clave = contrasena();
  alta(usuario, clave);

  console.log(`\n  ${rotada ? 'Rotada' : 'Creada'} la credencial de ${usuario}.\n`);
  console.log(`    usuario      ${usuario}`);
  console.log(`    contraseña   ${clave}\n`);

  if (esPuente) {
    console.log('  Va en .env.local, que es de donde la lee el puente:\n');
    console.log(`    MQTT_USUARIO=${usuario}`);
    console.log(`    MQTT_CLAVE=${clave}\n`);
  } else {
    console.log('  Este equipo publica en:\n');
    console.log(`    ${topicoDe(usuario)}`);
    console.log(`        todo lo que midió en un instante, junto`);
    console.log(`    ${topicoDeMagnitud(usuario, '<clave>')}`);
    console.log(`        una sola magnitud\n`);
    console.log('  Para probarla desde acá, sin el fierro delante:\n');
    console.log(
      `    docker compose exec ${SERVICIO} mosquitto_pub -q 1 -u ${usuario} -P '${clave}' -t ${topicoDe(usuario)} -m '{"<clave>": 398.4}'\n`,
    );
    /* El `-q 1` no es decoración, y el firmware tiene que hacer lo mismo: un
       mensaje QoS 0 no se encola para un suscriptor ausente, así que todo lo
       que un equipo publique mientras el puente esté caído se pierde sin dejar
       rastro. Con QoS 1 el broker se lo guarda y se lo entrega al volver. */
    console.log('  El «-q 1» va también en el firmware: lo que se publica con QoS 0');
    console.log('  mientras el puente está caído no lo guarda nadie.\n');
  }

  /* Que no se puede recuperar se dice acá y no en la documentación, que es
     donde nadie la va a leer a tiempo. */
  console.log('  Anotala: no queda guardada en ningún lado. Correr esto de nuevo la rota.\n');
}

try {
  main();
} catch (falla: unknown) {
  console.error(`\n  ${falla instanceof Error ? falla.message : String(falla)}`);
  console.error(USO);
  process.exitCode = 1;
}
