/**
 * Alta de un administrador, a mano.
 *
 * La semilla siembra usuarios de demostración cuyos hashes están escritos en el
 * repositorio: sirven para trabajar en local y para stage, y no pueden existir
 * en producción. Este script es la otra vía —la única que crea una credencial
 * cuya contraseña no está en ningún archivo—, y por eso queda afuera del
 * deploy: lo corre una persona, cuando hace falta.
 *
 *   npm run db:crear-admin
 *
 * Lo primero que imprime es a qué base está por escribir. Un super
 * administrador creado sin querer contra producción no tiene deshacer, y la
 * única señal de que eso está por pasar es esa línea.
 *
 * Sin terminal —un contenedor, un paso de despliegue— toma los datos del
 * entorno: ADMIN_USUARIO, ADMIN_CLAVE, ADMIN_NOMBRE, ADMIN_CLIENTE y ADMIN_ROL.
 * Van por variable de entorno y no por argumento a propósito: los argumentos de
 * un proceso los lee cualquiera que liste los procesos de la máquina.
 *
 * Hashea con `hashear` de lib/auth/contrasena.ts, la misma función que usa la
 * aplicación. Reimplementar el formato acá sería fabricar el día en que los dos
 * dejen de coincidir y nadie pueda entrar.
 */

import { createInterface } from 'node:readline';
import { PrismaClient } from '@prisma/client';
import { CLAVE_MINIMA, hashear } from '../lib/auth/contrasena';
import { ROLES, ROTULO_ROL, esRol, type Rol } from '../lib/auth/roles';

const db = new PrismaClient();

type Datos = {
  usuario: string;
  nombre: string;
  clave: string;
  cliente: string;
  rol: Rol;
};

/* La misma normalización que hace el acceso al buscar (lib/auth/usuarios.ts).
   Sin esto se crea «Demo@X.com» y después nadie entra escribiendo «demo@x.com». */
const normalizar = (nombre: string) => nombre.trim().toLowerCase();

/** A qué base apunta esto, sin revelar la contraseña que lleva la URL. */
function destino(url: string | undefined) {
  if (!url) return '(DATABASE_URL sin definir)';
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || '5432'}${u.pathname}`;
  } catch {
    return '(DATABASE_URL ilegible)';
  }
}

/* --------------------------- Preguntas --------------------------- */

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

/* readline no sabe dejar de hacer eco de lo que se tipea, así que se le
   reemplaza la salida por una que puede callarse. Es la única forma de pedir
   una contraseña sin que quede escrita en pantalla. */
let mudo = false;
const interna = rl as unknown as { _writeToOutput: (s: string) => void };
const escribirOriginal = interna._writeToOutput.bind(rl);
interna._writeToOutput = (s: string) => {
  if (!mudo) escribirOriginal(s);
};

const preguntar = (texto: string) =>
  new Promise<string>((resolve) => rl.question(texto, (valor) => resolve(valor.trim())));

const preguntarClave = (texto: string) =>
  new Promise<string>((resolve) => {
    /* El prompt se escribe antes de callar la salida: lo que se calla es lo que
       viene después, que es lo que se tipea. */
    rl.question(texto, (valor) => {
      mudo = false;
      process.stdout.write('\n');
      resolve(valor);
    });
    mudo = true;
  });

async function preguntarHasta(texto: string, valido: (v: string) => string | null) {
  for (;;) {
    const valor = await preguntar(texto);
    const problema = valido(valor);
    if (!problema) return valor;
    console.log(`  ${problema}`);
  }
}

/* ------------------------- Juntar los datos ------------------------- */

function delEntorno(): Datos {
  const { ADMIN_USUARIO, ADMIN_CLAVE, ADMIN_NOMBRE, ADMIN_CLIENTE, ADMIN_ROL } = process.env;

  const faltan = Object.entries({
    ADMIN_USUARIO,
    ADMIN_CLAVE,
    ADMIN_NOMBRE,
    ADMIN_CLIENTE,
    ADMIN_ROL,
  })
    .filter(([, valor]) => !valor)
    .map(([nombre]) => nombre);

  if (faltan.length) {
    throw new Error(
      `Sin terminal interactiva hay que pasar todo por el entorno. Falta: ${faltan.join(', ')}.`,
    );
  }
  if (!esRol(ADMIN_ROL)) throw new Error(`ADMIN_ROL no es un rol conocido: ${ADMIN_ROL}`);
  if ((ADMIN_CLAVE as string).length < CLAVE_MINIMA) {
    throw new Error(`ADMIN_CLAVE tiene menos de ${CLAVE_MINIMA} caracteres.`);
  }

  return {
    usuario: normalizar(ADMIN_USUARIO as string),
    nombre: (ADMIN_NOMBRE as string).trim(),
    clave: ADMIN_CLAVE as string,
    cliente: normalizar(ADMIN_CLIENTE as string),
    rol: ADMIN_ROL,
  };
}

async function preguntando(): Promise<Datos> {
  const usuario = normalizar(
    await preguntarHasta('Usuario (con el que entra): ', (v) => (v ? null : 'No puede quedar vacío.')),
  );

  const nombre = await preguntarHasta('Nombre (como se muestra en pantalla): ', (v) =>
    v ? null : 'No puede quedar vacío.',
  );

  const existentes = await db.client.findMany({ orderBy: { id: 'asc' } });
  console.log(
    existentes.length
      ? `\nEmpresas dadas de alta: ${existentes.map((c) => c.id).join(', ')}`
      : '\nNo hay ninguna empresa dada de alta todavía; se crea la que indiques.',
  );
  const cliente = normalizar(
    await preguntarHasta('Empresa (identificador, ej. tecvol): ', (v) =>
      v ? null : 'No puede quedar vacío.',
    ),
  );

  console.log(`\nRoles: ${ROLES.map((r) => `${r} (${ROTULO_ROL[r]})`).join(', ')}`);
  const rol = (await preguntarHasta('Rol: ', (v) =>
    esRol(v) ? null : `Tiene que ser uno de: ${ROLES.join(', ')}.`,
  )) as Rol;

  console.log('');
  for (;;) {
    const clave = await preguntarClave(`Contraseña (mínimo ${CLAVE_MINIMA} caracteres): `);
    if (clave.length < CLAVE_MINIMA) {
      console.log(`  Muy corta: ${clave.length} de ${CLAVE_MINIMA}.`);
      continue;
    }
    if ((await preguntarClave('Repetila: ')) !== clave) {
      console.log('  No coinciden.');
      continue;
    }
    return { usuario, nombre, clave, cliente, rol };
  }
}

/* ------------------------------ Alta ------------------------------ */

async function crear(datos: Datos) {
  const yaEsta = await db.user.findUnique({ where: { username: datos.usuario } });
  if (yaEsta) {
    throw new Error(
      `Ya existe un usuario «${datos.usuario}». Este script da de alta; no cambia contraseñas.`,
    );
  }

  const hash = await hashear(datos.clave);

  /* Todo en una transacción: una empresa creada sin su administrador deja un
     alta a medias que después hay que ir a limpiar a mano. */
  return db.$transaction(async (tx) => {
    await tx.client.upsert({
      where: { id: datos.cliente },
      update: {},
      create: { id: datos.cliente, label: datos.cliente },
    });
    return tx.user.create({
      data: {
        username: datos.usuario,
        name: datos.nombre,
        hash,
        clientId: datos.cliente,
        roles: { create: [{ role: datos.rol }] },
      },
      include: { client: true, roles: true },
    });
  });
}

/* ------------------------------ Main ------------------------------ */

async function main() {
  const donde = destino(process.env.DATABASE_URL);
  const interactivo = Boolean(process.stdin.isTTY) && !process.env.ADMIN_USUARIO;

  console.log('\n  Alta de administrador');
  console.log(`  Base de datos: ${donde}\n`);

  const datos = interactivo ? await preguntando() : delEntorno();

  if (interactivo) {
    console.log('');
    console.log(`  Usuario:  ${datos.usuario}`);
    console.log(`  Nombre:   ${datos.nombre}`);
    console.log(`  Empresa:  ${datos.cliente}`);
    console.log(`  Rol:      ${ROTULO_ROL[datos.rol]}`);
    console.log(`  Base:     ${donde}`);
    console.log('');
    if ((await preguntar('¿Se crea? [s/N] ')).toLowerCase() !== 's') {
      console.log('No se creó nada.\n');
      return;
    }
  }

  const creado = await crear(datos);
  const roles = creado.roles.map((r) => ROTULO_ROL[r.role]).join(', ');
  console.log(`\n  Creado: ${creado.username} (${creado.name}) — ${roles} de ${creado.client.label}.\n`);
}

main()
  .catch((error: unknown) => {
    console.error(`\n  ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await db.$disconnect();
  });
