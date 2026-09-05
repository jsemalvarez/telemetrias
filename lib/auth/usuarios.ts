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
  {
    id: 'u_demo',
    usuario: 'demo',
    nombre: 'Cuenta de demostración',
    hash: 'scrypt$16384$8$1$OajxHj3B2FxtAB15bzyTJA==$G5ozfsDyWW/9nA1FG6wsxF7sBxpekJ88c2/ic4KOdrk=',
    roles: ['admin'],
    cliente: 'demo',
    ver: 1,
    activo: true,
  },
  {
    id: 'u_encargado',
    usuario: 'encargado',
    nombre: 'Encargado de la instalación',
    hash: 'scrypt$16384$8$1$8B7RL3ooPWXptO1acpXhEQ==$rhIAZ5lzjKvCReg5oJDcOLt9bt6Ds+a6XD+7kgYjF90=',
    /* Un encargado puro: fija umbrales y no lee el tablero. Es el que hace
       visible que el corte de permisos existe. */
    roles: ['encargado'],
    cliente: 'demo',
    ver: 1,
    activo: true,
  },
  {
    id: 'u_super',
    usuario: 'super',
    nombre: 'Super administrador',
    hash: 'scrypt$16384$8$1$2w5iT7aEXnhMYWY7q/IdIg==$Kcc2vp5SG72yB4WhURAOMRIdwFQMtMpQaY0K17/yp84=',
    roles: ['superadmin'],
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
