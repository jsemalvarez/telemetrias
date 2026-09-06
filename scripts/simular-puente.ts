/**
 * El puente MQTT→REST, simulado.
 *
 * La cadena real es
 *
 *     microcontrolador --MQTT--> Mosquitto --MQTT--> puente --REST--> la app
 *
 * y este script es el último tramo: hace exactamente los mismos POST a
 * `/api/reportes` que va a hacer el puente cuando exista. No habla MQTT, no
 * necesita broker y no simula ningún dispositivo — **simula al puente**, que es
 * la única pieza con la que esta aplicación conversa.
 *
 * Sirve para dos cosas concretas:
 *
 *   — Ver el panel actualizarse sin tener el fierro delante.
 *   — Probar el aislamiento entre empresas: dos navegadores, una empresa en
 *     cada uno, y este script moviendo un equipo de cada una. Cada panel tiene
 *     que ver lo suyo y nada de lo del vecino.
 *
 *     npm run simular-puente -- TVL-DEMO-01:luminosidad:0:4095
 *     npm run simular-puente -- TVL-DEMO-01:luminosidad:0:4095 AST-0007:corriente-de-linea:0:400
 *
 * Cada objetivo es `SERIAL:clave:desde:hasta`. La clave es la que el padrón
 * derivó del rótulo al declarar la magnitud, y se ve abajo del borne en la
 * pantalla de Dispositivos.
 *
 * Opciones: `--url` (por defecto http://localhost:3000), `--cada` en
 * milisegundos entre reportes, `--periodo` en segundos que tarda un barrido
 * completo de ida y vuelta, `--veces` para que termine solo.
 *
 * **El valor barre como una perilla y no como un sensor**: una sinusoide limpia
 * entre los dos extremos, sin ruido. Es a propósito — quien mira la demo tiene
 * que poder relacionar lo que ve en la aguja con lo que haría su mano sobre la
 * perilla, y un temblor encima de eso sólo distrae. Cada objetivo arranca en
 * una fase distinta para que dos agujas no se muevan en espejo.
 *
 * **La marca de tiempo la pone este script**, como la va a poner el puente: un
 * microcontrolador sin reloj de tiempo real no sabe qué hora es, así que quien
 * sella el `medidoEn` es el primero de la cadena que sí lo sabe. Queda visible
 * en el panel, porque `medidoEn` y `recibidoEn` van a quedar casi pegados — que
 * es exactamente lo que hay que ver cuando el equipo no tiene reloj propio.
 */

import { readFileSync } from 'node:fs';

/* ------------------------------- El entorno ------------------------------- */

/**
 * `PUENTE_CLAVE` vive en `.env.local`, y a este script no se lo carga nadie:
 * Prisma lee `.env` por su cuenta, pero acá no hay Prisma. Doce líneas propias
 * antes que una dependencia, y con la misma precedencia que usa Next —
 * `.env.local` pisa a `.env`—, que es lo que el `.env.example` documenta.
 */
function delEntorno(nombre: string): string | undefined {
  if (process.env[nombre]) return process.env[nombre];

  for (const archivo of ['.env.local', '.env']) {
    let texto: string;
    try {
      texto = readFileSync(archivo, 'utf8');
    } catch {
      continue;
    }
    for (const linea of texto.split(/\r?\n/)) {
      const limpia = linea.trim();
      if (!limpia || limpia.startsWith('#')) continue;
      const corte = limpia.indexOf('=');
      if (corte < 0) continue;
      if (limpia.slice(0, corte).trim() !== nombre) continue;
      return limpia.slice(corte + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
  return undefined;
}

/* ------------------------------ Los argumentos ------------------------------ */

type Objetivo = { serial: string; clave: string; desde: number; hasta: number };

const USO = `
Uso:  npm run simular-puente -- SERIAL:clave:desde:hasta [...]

  SERIAL      el que trae grabado el equipo, tal como está declarado
  clave       la que el padrón derivó del rótulo de la magnitud
  desde,hasta entre qué valores barre

Opciones:
  --url <URL>      a dónde reportar        (http://localhost:3000)
  --cada <ms>      entre reporte y reporte (1000)
  --periodo <s>    un barrido completo     (20)
  --veces <n>      cuántos reportes y para (sin límite)

Ejemplo:
  npm run simular-puente -- TVL-DEMO-01:luminosidad:0:4095 AST-0007:corriente-de-linea:0:400
`;

function leerArgumentos(argv: string[]) {
  const opciones = { url: 'http://localhost:3000', cada: 1000, periodo: 20, veces: Infinity };
  const objetivos: Objetivo[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--url') {
      opciones.url = (argv[++i] ?? '').replace(/\/+$/, '');
      continue;
    }
    if (arg === '--cada' || arg === '--periodo' || arg === '--veces') {
      const numero = Number(argv[++i]);
      if (!Number.isFinite(numero) || numero <= 0) {
        throw new Error(`${arg} tiene que ser un número mayor que cero.`);
      }
      if (arg === '--cada') opciones.cada = numero;
      if (arg === '--periodo') opciones.periodo = numero;
      if (arg === '--veces') opciones.veces = numero;
      continue;
    }
    if (arg.startsWith('--')) throw new Error(`No conozco la opción ${arg}.`);

    const partes = arg.split(':');
    if (partes.length !== 4) {
      throw new Error(`«${arg}» no tiene forma de SERIAL:clave:desde:hasta.`);
    }
    const [serial, clave, desde, hasta] = partes;
    const a = Number(desde);
    const b = Number(hasta);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) {
      throw new Error(`En «${arg}», «desde» tiene que ser un número menor que «hasta».`);
    }
    objetivos.push({ serial: serial.toUpperCase(), clave, desde: a, hasta: b });
  }

  if (!objetivos.length) throw new Error('Falta decir qué equipo mover.');
  return { opciones, objetivos };
}

/* -------------------------------- El barrido -------------------------------- */

/**
 * Dónde está la perilla en este instante.
 *
 * Un coseno invertido: arranca en el extremo de abajo, sube hasta el de arriba
 * y vuelve, sin saltos ni en los extremos ni en el medio. `fase` corre a cada
 * objetivo su cuarto de vuelta para que dos agujas no se muevan iguales.
 *
 * Se redondea a entero cuando el recorrido es grande —un ADC de 12 bits no
 * reporta decimales— y a dos decimales cuando es chico, donde un entero
 * escondería todo el movimiento.
 */
function valorEn(objetivo: Objetivo, t: number, periodo: number, fase: number): number {
  const vuelta = ((t / periodo) + fase) * 2 * Math.PI;
  const recorrido = objetivo.hasta - objetivo.desde;
  const crudo = objetivo.desde + (recorrido * (1 - Math.cos(vuelta))) / 2;
  return recorrido >= 100 ? Math.round(crudo) : Math.round(crudo * 100) / 100;
}

const hora = () => new Date().toTimeString().slice(0, 8);

/* --------------------------------- El envío --------------------------------- */

async function reportar(url: string, clave: string, objetivo: Objetivo, valor: number) {
  const etiqueta = `${objetivo.serial} ${objetivo.clave}=${valor}`;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${url}/api/reportes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clave}` },
      body: JSON.stringify({
        serial: objetivo.serial,
        /* Lo sella el puente, como en la vida real: el equipo no tiene reloj. */
        medidoEn: new Date().toISOString(),
        lecturas: { [objetivo.clave]: valor },
      }),
    });
  } catch (falla) {
    console.log(`${hora()}  ${etiqueta}  — sin enlace con ${url} (${(falla as Error).message})`);
    return;
  }

  const cuerpo = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    console.log(`${hora()}  ${etiqueta}  — ${respuesta.status}: ${cuerpo?.mensaje ?? 'sin detalle'}`);
    return;
  }

  /* Se imprime lo que contestó el endpoint y no un «ok»: una clave mal escrita
     devuelve 200 con la lectura en `ignoradas`, y sin esta línea alguien puede
     estar media hora mirando una aguja quieta sin saber por qué. */
  const ignorada = cuerpo?.ignoradas?.[0];
  if (ignorada) {
    console.log(`${hora()}  ${etiqueta}  — IGNORADA (${ignorada.motivo})`);
    return;
  }
  if (cuerpo?.repetidas?.length) {
    console.log(`${hora()}  ${etiqueta}  — repetida`);
    return;
  }
  const fuera = cuerpo?.enServicio === false ? '  [fuera de servicio]' : '';
  console.log(`${hora()}  ${etiqueta}  guardada${fuera}`);
}

/* ---------------------------------- Correr ---------------------------------- */

async function main() {
  const { opciones, objetivos } = leerArgumentos(process.argv.slice(2));

  const clave = delEntorno('PUENTE_CLAVE');
  if (!clave) {
    throw new Error(
      'Falta PUENTE_CLAVE. Va en .env.local; está documentada en .env.example.',
    );
  }

  console.log(`Puente simulado → ${opciones.url}`);
  console.log(
    `Un reporte cada ${opciones.cada} ms, barrido completo cada ${opciones.periodo} s.\n`,
  );
  for (const o of objetivos) {
    console.log(`  ${o.serial}  ${o.clave}  ${o.desde} … ${o.hasta}`);
  }
  console.log('\nCtrl+C para cortar.\n');

  const arranque = Date.now();
  let vueltas = 0;

  /* En serie y no en paralelo: son dos o tres pedidos y así el registro sale en
     un orden que se puede leer mientras corre. */
  while (vueltas < opciones.veces) {
    const t = (Date.now() - arranque) / 1000;
    for (let i = 0; i < objetivos.length; i += 1) {
      const objetivo = objetivos[i];
      const fase = i / Math.max(objetivos.length, 2) / 2;
      await reportar(opciones.url, clave, objetivo, valorEn(objetivo, t, opciones.periodo, fase));
    }
    vueltas += 1;
    if (vueltas < opciones.veces) {
      await new Promise((listo) => setTimeout(listo, opciones.cada));
    }
  }
}

main().catch((falla: unknown) => {
  console.error(`\n  ${falla instanceof Error ? falla.message : String(falla)}`);
  console.error(USO);
  process.exitCode = 1;
});
