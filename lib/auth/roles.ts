/**
 * Roles y permisos.
 *
 * Los tres roles son **jerárquicos**: cada uno contiene al de abajo. Un admin
 * puede lo que puede un encargado, y un super administrador puede lo que puede
 * un admin, en cualquier cliente. Eso no se expresa con herencia sino listando
 * los permisos de cada rol completos: la tabla se lee de un vistazo, y un rol
 * que mañana deje de contener a otro no obliga a desarmar nada.
 *
 * Un usuario tiene **varios** roles: `roles` es una lista, no un campo. Cuando
 * exista la base de datos pasa a ser una tabla `usuario_rol` y nada de lo que
 * hay arriba de este archivo cambia.
 *
 * La regla que sostiene todo esto: **ninguna pantalla pregunta por un rol**. Se
 * pregunta por un permiso, con `puede`. Un rol nuevo, o uno que cambia de
 * alcance, se resuelve acá adentro y no obliga a recorrer la interfaz.
 */

export const ROLES = ['superadmin', 'admin', 'encargado'] as const;
export type Rol = (typeof ROLES)[number];

/** Cómo se nombra cada rol en pantalla. */
export const ROTULO_ROL: Record<Rol, string> = {
  superadmin: 'Super administrador',
  admin: 'Administrador',
  encargado: 'Encargado',
};

/**
 * Los permisos son verbos del producto, no pantallas. `umbral:definir` sigue
 * significando lo mismo si mañana los umbrales se fijan en otro lado.
 */
export const PERMISOS = [
  'lectura:ver',
  'umbral:definir',
  'dispositivo:administrar',
  'personal:ver',
  'personal:crear',
  'cliente:crear',
  'cliente:cruzar',
] as const;
export type Permiso = (typeof PERMISOS)[number];

/**
 * Qué habilita cada rol.
 *
 * `cliente:cruzar` es el permiso peligroso: rompe el aislamiento que el
 * producto promete —cada cliente ve lo suyo— y por eso lo tiene un solo rol,
 * declarado explícito y no derivado de la jerarquía.
 *
 * El encargado **sí** lee las mediciones: lo confirmó el usuario el 2026-09-05 y
 * con eso se cerró la interpretación que PRODUCT.md dejaba abierta. Fijar un
 * umbral sin ver la lectura que ese umbral vigila era trabajar a ciegas.
 *
 * `personal:ver` y `personal:crear` son lo único que queda separando a un admin
 * de un encargado. El admin ve y da de alta al personal de su empresa
 * (administradores y encargados); el encargado no. Sin ese corte los dos roles
 * habilitarían exactamente lo mismo, y entonces `modosDisponibles` le ofrecería
 * la posición de administrador a un encargado puro: la llave lo dejaría subir,
 * que es lo que nunca puede pasar.
 *
 * La jerarquía se mantiene: el admin conserva `umbral:definir`, así que ve la
 * pantalla de Dispositivos además de la de Personal —puede todo lo que puede el
 * encargado—, y lo que distingue al encargado es que a él le falta Personal.
 * Confirmado por el usuario el 2026-09-05.
 *
 * `dispositivo:administrar` corta el padrón de equipos por la mitad, y ésa es
 * la mitad que importa (2026-09-06). El encargado **fija umbrales**: entra a la
 * pantalla con `umbral:definir`, ve los dispositivos y les pone el mínimo y el
 * máximo que disparan la alerta. Lo que no hace es dar de alta uno, editarlo ni
 * darlo de baja, porque eso no es configurar una alerta: es declarar que se
 * instaló un fierro, y quien responde por el parque de una empresa es su
 * administrador.
 *
 * Se llama `administrar` y no `crear` a propósito, contra el nombre tentativo
 * con que se pidió. El permiso gobierna tres actos —alta, edición y baja— y un
 * permiso llamado `crear` que autoriza una baja miente en el catálogo, que es
 * el único lugar donde alguien va a ir a leer qué puede cada rol.
 *
 * Darlo a admin y super no mueve nada de lo que ya estaba: sigue estrictamente
 * contenido en el super y sigue conteniendo estrictamente al encargado, así que
 * `modosDisponibles` y `rolesQueOtorga` devuelven exactamente lo mismo que
 * antes. Un permiso que se le agrega al admin y no al encargado ensancha esa
 * distancia; uno que se le agregara sólo al encargado la rompería.
 */
const POR_ROL: Record<Rol, readonly Permiso[]> = {
  superadmin: [
    'lectura:ver',
    'umbral:definir',
    'dispositivo:administrar',
    'personal:ver',
    'personal:crear',
    'cliente:crear',
    'cliente:cruzar',
  ],
  admin: ['lectura:ver', 'umbral:definir', 'dispositivo:administrar', 'personal:ver', 'personal:crear'],
  encargado: ['lectura:ver', 'umbral:definir'],
};

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === 'string' && (ROLES as readonly string[]).includes(valor);
}

/** Roles desconocidos se descartan: un token viejo con un rol retirado no rompe. */
export function normalizarRoles(valor: unknown): Rol[] {
  if (!Array.isArray(valor)) return [];
  const limpios = valor.filter(esRol);
  return limpios.filter((rol, i) => limpios.indexOf(rol) === i);
}

export function permisosDe(roles: readonly Rol[]): Set<Permiso> {
  const suma = new Set<Permiso>();
  for (const rol of roles) for (const p of POR_ROL[rol] ?? []) suma.add(p);
  return suma;
}

/**
 * La única pregunta que debería hacer una pantalla.
 *
 * Con un modo activo, el alcance es ese rol solo; sin modo, la unión de todos.
 * El modo siempre sale de `modoValido`, que sólo acepta un rol cuyos permisos ya
 * estén entre los del usuario: lo que habilita es por construcción un
 * subconjunto de lo que dan sus roles. **El modo restringe, nunca amplía**, y
 * ésa es la propiedad que hace que un conmutador de vista no sea una escalada
 * de privilegios con forma de menú.
 */
export function puede(
  sujeto: { roles: readonly Rol[]; modo?: Rol | null } | null | undefined,
  permiso: Permiso,
) {
  if (!sujeto) return false;
  return permisosEfectivos(sujeto).has(permiso);
}

/** Los permisos que rigen ahora mismo: los del modo activo, o los de todo. */
export function permisosEfectivos(sujeto: { roles: readonly Rol[]; modo?: Rol | null }) {
  return permisosDe(sujeto.modo ? [sujeto.modo] : sujeto.roles);
}

/**
 * Las posiciones que la llave puede tomar: todo rol que no agregue ni un
 * permiso a los que el usuario ya tiene.
 *
 * Con roles jerárquicos, esto es lo que deja a un super administrador bajar a
 * admin o a encargado sin tener esos roles asignados — bajar de nivel no le da
 * nada que no tuviera. Y sigue valiendo si mañana los roles dejan de
 * contenerse: la regla se define por permisos, no por una escalera codificada.
 */
export function modosDisponibles(roles: readonly Rol[]): Rol[] {
  const tiene = permisosDe(roles);
  return ROLES.filter((rol) => {
    for (const p of POR_ROL[rol]) if (!tiene.has(p)) return false;
    return true;
  });
}

/**
 * El rol con el que se entra por defecto: el de mayor alcance, desempatando por
 * el orden del catálogo. Quien tiene una sola posición no elige nada.
 */
export function modoPorDefecto(roles: readonly Rol[]): Rol | null {
  let elegido: Rol | null = null;
  let mayor = -1;
  for (const rol of modosDisponibles(roles)) {
    const cuantos = permisosDe([rol]).size;
    if (cuantos > mayor) {
      mayor = cuantos;
      elegido = rol;
    }
  }
  return elegido;
}

/**
 * Valida un modo que llega de afuera —una cookie, un cuerpo de pedido— contra
 * lo que el usuario realmente puede. Un modo que no le corresponde no es un
 * error: cae al de por defecto, que tampoco le da nada que no tuviera.
 */
export function modoValido(roles: readonly Rol[], candidato: unknown): Rol | null {
  if (esRol(candidato) && modosDisponibles(roles).includes(candidato)) return candidato;
  return modoPorDefecto(roles);
}

/**
 * Los roles que este sujeto puede otorgar cuando da de alta a alguien.
 *
 * La regla es una sola: **se otorga todo rol cuyos permisos estén estrictamente
 * contenidos en los propios**. Contenidos, porque nadie reparte lo que no
 * tiene; y estrictamente, porque nadie da de alta a un par suyo. De ahí sale,
 * sin escalera codificada:
 *
 *     super     → admin, encargado
 *     admin     → encargado
 *     encargado → nada
 *
 * Sale sobre `permisosEfectivos`, así que la llave −S1 también recorta acá: un
 * super que bajó a modo administrador otorga lo que otorga un administrador. El
 * modo restringe y nunca amplía, y esta función no es la excepción.
 *
 * Que un super no pueda crear a otro super es consecuencia de la regla, y es la
 * consecuencia correcta: la credencial que abre el padrón de todas las empresas
 * no se fabrica desde un navegador con una sesión abierta. Sale de la semilla o
 * de `scripts/crear-admin.ts`, que corre una persona en una terminal. El día
 * que tenga que salir de una pantalla va a ser una excepción escrita a mano acá
 * adentro, y no un descuido.
 *
 * Sin esta pieza, `personal:crear` es un permiso plano: alcanzaría con que el
 * cuerpo del pedido dijera `superadmin` para que un administrador se fabrique
 * un jefe. Es lo único que separa un alta de personal de una escalada de
 * privilegios con forma de formulario.
 */
export function rolesQueOtorga(
  sujeto: { roles: readonly Rol[]; modo?: Rol | null } | null | undefined,
): Rol[] {
  if (!sujeto) return [];
  const propios = permisosEfectivos(sujeto);

  return ROLES.filter((rol) => {
    const delRol = POR_ROL[rol];
    for (const permiso of delRol) if (!propios.has(permiso)) return false;
    /* Contenido y además más chico: si empatan es un par, no un subordinado.
       Comparar las cuentas alcanza, porque recién se verificó que la lista está
       contenida y en la tabla de arriba no hay permisos repetidos. */
    return delRol.length < propios.size;
  });
}

/**
 * Aislamiento por cliente. El sistema sirve a varias empresas y cada una ve lo
 * suyo: todo lo que consulte datos de un cliente pasa por acá, y no por una
 * comparación suelta de strings desperdigada por el código.
 */
export function alcanzaCliente(
  sujeto: { roles: readonly Rol[]; modo?: Rol | null; cliente: string } | null | undefined,
  cliente: string,
) {
  if (!sujeto) return false;
  if (puede(sujeto, 'cliente:cruzar')) return true;
  return sujeto.cliente === cliente;
}
