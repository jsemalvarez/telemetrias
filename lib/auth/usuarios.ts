import 'server-only';
import type { Rol } from './roles';

/**
 * El padrón de usuarios.
 *
 * **Éste es el único archivo que se reemplaza cuando exista la base de datos.**
 * Todo lo demás — tokens, cookies, middleware, permisos, pantallas — habla con
 * estas dos funciones y no sabe de dónde salen los usuarios. La migración es
 * cambiar el cuerpo de `porUsuario` y `porId` por una consulta.
 *
 * El `import 'server-only'` rompe el build si alguien importa este módulo desde
 * un componente cliente: acá adentro hay hashes de contraseña y no pueden
 * terminar en el bundle del navegador.
 *
 * Los hashes están sembrados, no calculados al arrancar, para que la contraseña
 * en texto plano no exista en el código fuente.
 */

export type Usuario = {
  id: string;
  usuario: string;
  nombre: string;
  /** scrypt$N$r$p$sal$hash — ver lib/auth/contrasena.ts */
  hash: string;
  /**
   * Varios roles por usuario desde el día uno. En la base de datos esto es una
   * tabla `usuario_rol`; acá es la lista que esa tabla va a devolver.
   *
   * Con roles jerárquicos, casi siempre alcanza con uno: un admin ya puede lo
   * que puede un encargado. La lista queda igual porque el costo es cero y la
   * jerarquía puede dejar de ser una línea recta en cualquier momento.
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
 * Semilla de demostración: un usuario por rol, para poder ver los tres niveles
 * funcionando antes de que exista el alta real.
 *
 * El monitoreo todavía no está instalado en ningún lado, así que estos no son
 * usuarios de un cliente real y no llevan nombres de empresas reales.
 */
const PADRON: Usuario[] = [
  /* Super administrador. No es personal de ninguna empresa cliente: es de
     Tecvol, el único que cruza el corte entre empresas. Por eso no aparece en
     el padrón de personal de un cliente ni cuenta como usuario de uno. Su
     credencial va aparte de la tarjeta de demostración del acceso —el que la
     necesita la recibe a mano— porque el super no es parte de la demo pública. */
  {
    id: 'u_super',
    usuario: 'superadmin@test.com',
    nombre: 'Super administrador',
    hash: 'scrypt$16384$8$1$Kug0+D7Dp86y/YTVupZ26A==$sGkdthLbbxUAmPi1/UWJACKGfJq/Udm1QAS2dPcXTkY=',
    roles: ['superadmin'],
    cliente: 'tecvol',
    ver: 1,
    activo: true,
  },
  /* Administrador de la empresa Tecvol: lee las métricas y da de alta al
     personal (administradores y encargados) de su empresa. */
  {
    id: 'u_demo',
    usuario: 'demo',
    nombre: 'Administrador de Tecvol',
    hash: 'scrypt$16384$8$1$OajxHj3B2FxtAB15bzyTJA==$G5ozfsDyWW/9nA1FG6wsxF7sBxpekJ88c2/ic4KOdrk=',
    roles: ['admin'],
    cliente: 'tecvol',
    ver: 1,
    activo: true,
  },
  /* Encargado de la empresa Tecvol: lee las métricas y fija los umbrales de los
     dispositivos, pero no da de alta personal. Es el que hace visible que el
     corte de permisos existe: entra al panel y no ve el mando de Personal. */
  {
    id: 'u_encargado',
    usuario: 'encargado',
    nombre: 'Encargado de Tecvol',
    hash: 'scrypt$16384$8$1$obhfx7dATuDZFEN1C/cseg==$6R32VZI5Ln9dZvb20Gxf/YbR83iRLpWceiqJDUOyoKQ=',
    roles: ['encargado'],
    cliente: 'tecvol',
    ver: 1,
    activo: true,
  },
];

/**
 * Hash señuelo. Cuando el usuario no existe se verifica igual contra éste, para
 * que entrar con un usuario inexistente tarde lo mismo que errarle a la
 * contraseña. Sin esto, el tiempo de respuesta dice qué usuarios existen.
 */
export const HASH_SENUELO = PADRON[0].hash;

const normalizar = (nombre: string) => nombre.trim().toLowerCase();

export async function porUsuario(nombre: string): Promise<Usuario | null> {
  const buscado = normalizar(nombre);
  return PADRON.find((u) => u.usuario === buscado) ?? null;
}

export async function porId(id: string): Promise<Usuario | null> {
  return PADRON.find((u) => u.id === id) ?? null;
}

/**
 * Los clientes del sistema: las empresas dadas de alta.
 *
 * Salen del mismo padrón sembrado que los usuarios, porque hoy un cliente no es
 * otra cosa que la empresa a la que un usuario pertenece. Cuando exista la base
 * pasa a ser una tabla `cliente` con su propia alta, y lo que cambia es el
 * cuerpo de `clientes` — nada de lo que hay arriba de este archivo.
 */
export type Cliente = {
  /** El identificador que viaja en el token de cada sesión. */
  id: string;
  rotulo: string;
  /** Cuántas credenciales activas tiene. Es el único número real que hay. */
  usuarios: number;
};

/* Cómo se nombra en pantalla cada cliente sembrado. Es un dato de fantasía,
   marcado para borrar cuando exista la base: el monitoreo todavía no está
   instalado en ningún lado y el padrón no puede fabricar una cartera de
   clientes que no existe. Hoy la única empresa sembrada es Tecvol. */
const ROTULO_CLIENTE: Record<string, string> = {
  tecvol: 'Tecvol',
};

/** El nombre de pantalla de un cliente, o su identificador si no tiene rótulo. */
export function rotuloCliente(id: string): string {
  return ROTULO_CLIENTE[id] ?? id;
}

/** ¿El usuario es personal de una empresa? Un super no lo es: es de Tecvol y
 *  cruza el corte, así que no cuenta como usuario de ningún cliente ni figura
 *  en su padrón de personal. Se pregunta por rol acá a propósito —es la única
 *  vez—, porque «ser personal de un cliente» es justamente no ser el que cruza. */
const esPersonal = (u: Usuario) => u.roles.includes('admin') || u.roles.includes('encargado');

export async function clientes(): Promise<Cliente[]> {
  const cuenta = new Map<string, number>();
  for (const u of PADRON) {
    if (u.activo && esPersonal(u)) cuenta.set(u.cliente, (cuenta.get(u.cliente) ?? 0) + 1);
  }
  return Array.from(cuenta, ([id, usuarios]) => ({
    id,
    rotulo: rotuloCliente(id),
    usuarios,
  }));
}

/**
 * El personal de una empresa: sus administradores y encargados. Es lo que ve el
 * admin en su pantalla de Personal.
 *
 * Nunca lleva hash ni nada que no se pueda mandar al cliente, igual que `Sesion`.
 * Cuando exista la base, esto es una consulta con `where cliente = ?`, y lo que
 * cambia es el cuerpo de esta función.
 */
export type Miembro = {
  id: string;
  usuario: string;
  nombre: string;
  roles: Rol[];
};

export async function personalDe(cliente: string): Promise<Miembro[]> {
  return PADRON.filter((u) => u.activo && u.cliente === cliente && esPersonal(u)).map((u) => ({
    id: u.id,
    usuario: u.usuario,
    nombre: u.nombre,
    roles: u.roles,
  }));
}
