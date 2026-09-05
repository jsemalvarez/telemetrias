/**
 * La semilla: el padrón mínimo para que el sistema se pueda usar.
 *
 * Hay dos clases de usuario acá, y la diferencia es el punto de este archivo:
 *
 *   — Los de DEMOSTRACIÓN (`demo`, `encargado`) llevan su hash escrito acá
 *     abajo. Está bien que sea así: son la demo, su contraseña se reparte en la
 *     tarjeta de la pantalla de acceso y es pública a propósito.
 *
 *   — El SUPER ADMINISTRADOR sale del entorno, de SEED_SUPERADMIN_USUARIO y
 *     SEED_SUPERADMIN_CLAVE. Es el único que cruza el corte entre empresas y ve
 *     los datos de todas: su credencial no puede estar en un archivo que se
 *     lleva puesto cualquiera que clone el repositorio. Sin esas dos variables
 *     no se siembra, y el resto del padrón se siembra igual.
 *
 * Es idempotente, y para el super eso pide una vuelta más: no alcanza con
 * hashear la clave del entorno y guardarla, porque scrypt sala cada hash y el
 * resultado sale distinto cada vez. Escribirlo en cada corrida cambiaría el
 * hash sin que nadie hubiera cambiado la contraseña, y subir la versión de
 * credenciales junto con él cerraría todas las sesiones abiertas cada vez que
 * alguien resiembra. Así que primero se verifica la clave del entorno contra lo
 * guardado, y sólo si NO coincide se rota —y ahí sí sube la versión, que es lo
 * que cierra las sesiones abiertas con la contraseña vieja, que es lo que
 * corresponde—. Los usuarios de demostración nunca ven su hash pisado: si
 * alguien cambió su contraseña en esta base, resembrar no se la revierte.
 *
 * Está en TypeScript para poder usar `hashear` y `verificar` de
 * lib/auth/contrasena.ts, las mismas funciones que usa la aplicación.
 * Reimplementar el formato del hash acá sería fabricar el día en que los dos
 * dejen de coincidir y nadie pueda entrar.
 *
 * Los nombres de modelo y campo son los del esquema, en inglés; los comentarios
 * siguen en español como el resto del proyecto, hasta el refactor.
 */

import { PrismaClient } from '@prisma/client';
import { CLAVE_MINIMA, hashear, verificar } from '../lib/auth/contrasena';
import type { Rol } from '../lib/auth/roles';

const db = new PrismaClient();

/** El id del super es fijo: viaja en los JWT ya emitidos. */
const ID_SUPER = 'u_super';

/* La misma normalización que hace el acceso al buscar. */
const normalizar = (nombre: string) => nombre.trim().toLowerCase();

type Sembrado = {
  id: string;
  username: string;
  name: string;
  hash: string;
  roles: Rol[];
  clientId: string;
};

const CLIENTES = [{ id: 'tecvol', label: 'Tecvol' }];

/**
 * Los de demostración, con su hash a la vista.
 *
 * Administrador de la empresa: lee las métricas y da de alta al personal.
 * Encargado: lee las métricas y fija umbrales, pero no da de alta personal.
 */
const DEMO: Sembrado[] = [
  {
    id: 'u_demo',
    username: 'demo',
    name: 'Administrador de Tecvol',
    hash: 'scrypt$16384$8$1$OajxHj3B2FxtAB15bzyTJA==$G5ozfsDyWW/9nA1FG6wsxF7sBxpekJ88c2/ic4KOdrk=',
    roles: ['admin'],
    clientId: 'tecvol',
  },
  {
    id: 'u_encargado',
    username: 'encargado',
    name: 'Encargado de Tecvol',
    hash: 'scrypt$16384$8$1$obhfx7dATuDZFEN1C/cseg==$6R32VZI5Ln9dZvb20Gxf/YbR83iRLpWceiqJDUOyoKQ=',
    roles: ['encargado'],
    clientId: 'tecvol',
  },
];

/** Lo que el entorno declara del super, ya validado. */
function superDelEntorno() {
  const usuario = process.env.SEED_SUPERADMIN_USUARIO;
  const clave = process.env.SEED_SUPERADMIN_CLAVE;

  if (!usuario || !clave) return null;
  if (clave.length < CLAVE_MINIMA) {
    throw new Error(
      `SEED_SUPERADMIN_CLAVE tiene ${clave.length} caracteres; el mínimo es ${CLAVE_MINIMA}.`,
    );
  }
  return { usuario: normalizar(usuario), clave };
}

/** Deja el usuario y sus roles como dicen los datos. */
async function sembrar({ roles, ...datos }: Sembrado, rotarClave: boolean) {
  await db.user.upsert({
    where: { id: datos.id },
    update: {
      username: datos.username,
      name: datos.name,
      active: true,
      /* Rotar la contraseña sin subir la versión de credenciales deja abiertas
         las sesiones que se abrieron con la anterior. */
      ...(rotarClave ? { hash: datos.hash, credentialVersion: { increment: 1 } } : {}),
    },
    create: datos,
  });

  /* Los roles se reafirman completos: acá está la definición de qué puede cada
     uno del padrón sembrado, y un rol de más sobreviviendo a la semilla es un
     permiso que nadie otorgó. */
  await db.userRole.deleteMany({ where: { userId: datos.id, role: { notIn: roles } } });
  for (const role of roles) {
    await db.userRole.upsert({
      where: { userId_role: { userId: datos.id, role } },
      update: {},
      create: { userId: datos.id, role },
    });
  }
}

/** Siembra el super, rotando la clave sólo si la del entorno es otra. */
async function sembrarSuper({ usuario, clave }: { usuario: string; clave: string }) {
  const existente = await db.user.findUnique({ where: { id: ID_SUPER } });

  /* La única forma de saber si la clave cambió es preguntárselo al hash
     guardado: dos hashes de la misma contraseña no se parecen en nada. */
  const rotar = !existente || !(await verificar(clave, existente.hash));

  await sembrar(
    {
      id: ID_SUPER,
      username: usuario,
      name: 'Super administrador',
      hash: rotar ? await hashear(clave) : existente.hash,
      roles: ['superadmin'],
      clientId: 'tecvol',
    },
    rotar,
  );

  if (!existente) return `y el super administrador ${usuario}, nuevo.`;
  return rotar
    ? `y el super administrador ${usuario}, con la clave rotada (sus sesiones abiertas quedaron cerradas).`
    : `y el super administrador ${usuario}, sin cambios.`;
}

async function main() {
  for (const cliente of CLIENTES) {
    await db.client.upsert({
      where: { id: cliente.id },
      update: { label: cliente.label },
      create: cliente,
    });
  }

  for (const usuario of DEMO) await sembrar(usuario, false);

  const entorno = superDelEntorno();
  const superadmin = entorno
    ? await sembrarSuper(entorno)
    : 'sin el super administrador: falta SEED_SUPERADMIN_USUARIO o SEED_SUPERADMIN_CLAVE.';

  console.log(`Sembrado: ${CLIENTES.length} cliente(s), ${DEMO.length} de demostración, ${superadmin}`);
}

main()
  .catch((error: unknown) => {
    console.error(`\n  ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
