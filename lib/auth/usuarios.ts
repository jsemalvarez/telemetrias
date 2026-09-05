import 'server-only';
import { cache } from 'react';
import { db } from '../db';
import { normalizarRoles, type Rol } from './roles';

/**
 * El padrón de usuarios.
 *
 * Éste era el único archivo que había que reemplazar cuando existiera la base
 * de datos, y esto es ese reemplazo: lo que antes recorría un arreglo sembrado
 * ahora consulta. Nada de lo que hay arriba —tokens, cookies, middleware,
 * permisos, pantallas— se enteró: las firmas son las mismas, y por eso el
 * cambio cabe en un archivo.
 *
 * Los nombres de la base están en inglés y los de la aplicación en español,
 * así que acá adentro hay una traducción. Es deliberado y transitorio: vive en
 * `aUsuario` y en cinco consultas, y desaparece cuando el refactor lleve al
 * resto del proyecto al mismo idioma.
 *
 * El `import 'server-only'` rompe el build si alguien importa este módulo desde
 * un componente cliente: acá adentro hay hashes de contraseña y no pueden
 * terminar en el bundle del navegador.
 */

export type Usuario = {
  id: string;
  usuario: string;
  nombre: string;
  /** scrypt$N$r$p$sal$hash — ver lib/auth/contrasena.ts */
  hash: string;
  /**
   * Varios roles por usuario. En la base es la tabla `user_roles`, una fila por
   * rol; acá es la lista que esa tabla devuelve.
   */
  roles: Rol[];
  /**
   * La empresa a la que pertenece. El sistema sirve a varios clientes y cada
   * uno ve lo suyo: éste es el corte, y sólo `cliente:cruzar` lo atraviesa.
   */
  cliente: string;
  /**
   * Versión de credenciales. Subirla invalida las sesiones abiertas de ese
   * usuario en el próximo refresco, sin necesidad de una lista de tokens
   * revocados. Se sube al cambiar la contraseña o al retirarle un rol.
   */
  ver: number;
  activo: boolean;
};

/**
 * Hash señuelo. Cuando el usuario no existe se verifica igual contra éste, para
 * que entrar con un usuario inexistente tarde lo mismo que errarle a la
 * contraseña. Sin esto, el tiempo de respuesta dice qué usuarios existen.
 *
 * Es el hash de una contraseña aleatoria que se descartó al generarlo: nadie la
 * conoce y no abre ninguna cuenta. Antes era el hash del primer usuario del
 * padrón, que funcionaba igual pero hacía que la credencial de una persona real
 * cumpliera dos papeles.
 */
export const HASH_SENUELO =
  'scrypt$16384$8$1$3Q2IaIxrur2KE8L3o8nTlg==$WwMIupqgtobROUsjl1HfIWnFD4KtoNX4p2uSvlXgkp0=';

/* Quien escribe pasa por la misma normalización que quien busca; si no, se da
   de alta «Demo» y después nadie entra escribiendo «demo». */
const normalizar = (nombre: string) => nombre.trim().toLowerCase();

/**
 * ¿El usuario es personal de una empresa? Un super no lo es: es de Tecvol y
 * cruza el corte, así que no cuenta como usuario de ningún cliente ni figura en
 * su padrón de personal. Se pregunta por rol acá a propósito —es la única vez—,
 * porque «ser personal de un cliente» es justamente no ser el que cruza.
 */
const ROLES_DE_PERSONAL = ['admin', 'encargado'] as const satisfies readonly Rol[];
const esPersonal = (rol: Rol) => (ROLES_DE_PERSONAL as readonly Rol[]).includes(rol);

/** Lo mínimo que hay que traer para armar un `Usuario`. */
const CON_ROLES = { roles: { select: { role: true } } };

type FilaUsuario = {
  id: string;
  username: string;
  name: string;
  hash: string;
  clientId: string;
  credentialVersion: number;
  active: boolean;
  roles: { role: Rol }[];
};

/** De la fila de la base al usuario que conoce la aplicación. */
function aUsuario(fila: FilaUsuario): Usuario {
  return {
    id: fila.id,
    usuario: fila.username,
    nombre: fila.name,
    hash: fila.hash,
    /* Un rol que la base tenga y el catálogo no —uno retirado a medias— se
       descarta acá y no llega a decidir ningún permiso. */
    roles: normalizarRoles(fila.roles.map((r) => r.role)),
    cliente: fila.clientId,
    ver: fila.credentialVersion,
    activo: fila.active,
  };
}

export async function porUsuario(nombre: string): Promise<Usuario | null> {
  const fila = await db.user.findUnique({
    where: { username: normalizar(nombre) },
    include: CON_ROLES,
  });
  return fila ? aUsuario(fila) : null;
}

export async function porId(id: string): Promise<Usuario | null> {
  const fila = await db.user.findUnique({ where: { id }, include: CON_ROLES });
  return fila ? aUsuario(fila) : null;
}

/**
 * Los clientes del sistema: las empresas dadas de alta.
 */
export type Cliente = {
  /** El identificador que viaja en el token de cada sesión. */
  id: string;
  rotulo: string;
  /** Cuántas credenciales activas tiene. */
  usuarios: number;
};

export async function clientes(): Promise<Cliente[]> {
  const filas = await db.client.findMany({
    where: { active: true },
    orderBy: { label: 'asc' },
    include: {
      users: { where: { active: true }, select: { roles: { select: { role: true } } } },
    },
  });

  return filas.map((cliente) => ({
    id: cliente.id,
    rotulo: cliente.label,
    usuarios: cliente.users.filter((u) => u.roles.some((r) => esPersonal(r.role))).length,
  }));
}

/**
 * El nombre de pantalla de un cliente, o su identificador si no está dado de
 * alta. `cache` de React la resuelve una sola vez por request: dos componentes
 * de la misma pantalla que pregunten por la misma empresa hacen una consulta.
 */
export const rotuloCliente = cache(async (id: string): Promise<string> => {
  const fila = await db.client.findUnique({ where: { id }, select: { label: true } });
  return fila?.label ?? id;
});

/**
 * El personal de una empresa: sus administradores y encargados. Es lo que ve el
 * admin en su pantalla de Personal.
 *
 * Nunca lleva hash ni nada que no se pueda mandar al cliente, igual que `Sesion`.
 */
export type Miembro = {
  id: string;
  usuario: string;
  nombre: string;
  roles: Rol[];
};

export async function personalDe(cliente: string): Promise<Miembro[]> {
  const filas = await db.user.findMany({
    where: {
      clientId: cliente,
      active: true,
      roles: { some: { role: { in: [...ROLES_DE_PERSONAL] } } },
    },
    orderBy: { name: 'asc' },
    include: CON_ROLES,
  });

  return filas.map((u) => ({
    id: u.id,
    usuario: u.username,
    nombre: u.name,
    roles: normalizarRoles(u.roles.map((r) => r.role)),
  }));
}
