import 'server-only';
import { cache } from 'react';
import { db } from '../db';
import { normalizarCorreo } from './reglas';
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
  /** Con esto entra. Es la identidad y es el único canal para avisarle algo. */
  correo: string;
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
  /**
   * Si la contraseña que abre esta cuenta la eligió quien la dio de alta, y no
   * su dueño. Mientras sea verdad, hay otra persona que la sabe.
   */
  claveProvisoria: boolean;
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
  email: string;
  name: string;
  hash: string;
  clientId: string;
  credentialVersion: number;
  active: boolean;
  provisionalPassword: boolean;
  roles: { role: Rol }[];
};

/** De la fila de la base al usuario que conoce la aplicación. */
function aUsuario(fila: FilaUsuario): Usuario {
  return {
    id: fila.id,
    correo: fila.email,
    nombre: fila.name,
    hash: fila.hash,
    /* Un rol que la base tenga y el catálogo no —uno retirado a medias— se
       descarta acá y no llega a decidir ningún permiso. */
    roles: normalizarRoles(fila.roles.map((r) => r.role)),
    cliente: fila.clientId,
    ver: fila.credentialVersion,
    activo: fila.active,
    claveProvisoria: fila.provisionalPassword,
  };
}

export async function porCorreo(correo: string): Promise<Usuario | null> {
  const fila = await db.user.findUnique({
    where: { email: normalizarCorreo(correo) },
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
  correo: string;
  nombre: string;
  roles: Rol[];
};

type FilaMiembro = { id: string; email: string; name: string; roles: { role: Rol }[] };

/** De la fila de la base al miembro que se puede mandar a la pantalla. */
function aMiembro(fila: FilaMiembro): Miembro {
  return {
    id: fila.id,
    correo: fila.email,
    nombre: fila.name,
    roles: normalizarRoles(fila.roles.map((r) => r.role)),
  };
}

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

  return filas.map(aMiembro);
}

/**
 * De quién es una dirección, si ya es de alguien.
 *
 * El índice de correos es único en todo el sistema, así que un alta puede
 * chocar contra una empresa que quien la intenta no puede ver. Devuelve de
 * quién es y de qué empresa, y **quien llama decide cuánto de eso dice**: no es
 * lo mismo contestarle a un super, que cruza el corte, que a un administrador,
 * que no.
 */
export async function duenoDelCorreo(
  correo: string,
): Promise<{ nombre: string; cliente: string } | null> {
  const fila = await db.user.findUnique({
    where: { email: normalizarCorreo(correo) },
    select: { name: true, clientId: true },
  });
  return fila ? { nombre: fila.name, cliente: fila.clientId } : null;
}

/**
 * Alta de una persona en el padrón de una empresa.
 *
 * La empresa llega como parámetro y sale siempre de la sesión de quien da el
 * alta, nunca de lo que mandó el navegador: un `cliente` que viajara en el
 * cuerpo del pedido sería un campo para sembrar usuarios en el padrón ajeno.
 *
 * `roles` es una lista y no un rol porque la tabla `user_roles` guarda una fila
 * por rol y una persona puede tener varios. Quién puede otorgar cuáles no se
 * decide acá: lo decide `rolesQueOtorga` y lo hace cumplir el handler, que es
 * donde está la sesión. Este módulo escribe lo que le mandan.
 *
 * Nace con `provisionalPassword` en verdadero, siempre: la contraseña la
 * eligió quien da el alta, no su dueño, y hasta que la cambie hay otra persona
 * que la sabe.
 */
export async function crearMiembro(datos: {
  cliente: string;
  correo: string;
  nombre: string;
  /** Ya hasheada. Este módulo no ve contraseñas en claro. */
  hash: string;
  roles: Rol[];
  /** El id de quien firma el alta. Queda en la fila y no se puede borrar. */
  creadoPor: string;
}): Promise<Miembro> {
  const fila = await db.user.create({
    data: {
      email: normalizarCorreo(datos.correo),
      name: datos.nombre,
      hash: datos.hash,
      clientId: datos.cliente,
      provisionalPassword: true,
      createdById: datos.creadoPor,
      roles: { create: datos.roles.map((role) => ({ role })) },
    },
    include: CON_ROLES,
  });

  return aMiembro(fila);
}
