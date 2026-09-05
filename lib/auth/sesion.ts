import type { Rol } from './roles';

/**
 * La sesión tal como la ven las pantallas: lo mínimo para saludar al usuario y
 * decidir qué puede hacer. Nunca lleva hash, ni token, ni nada que no se pueda
 * mandar al cliente.
 *
 * `cliente` es el aislamiento del producto: la empresa cuya flota se está
 * mirando. Viaja en el token desde el principio por la misma razón que `roles`
 * es una lista — meterlo después obliga a reemitir todas las sesiones.
 */
export type Sesion = {
  id: string;
  usuario: string;
  nombre: string;
  roles: Rol[];
  cliente: string;
  /**
   * El rol con el que está mirando ahora. Siempre uno de `roles` — se valida
   * contra ellos en cada request— así que restringe el alcance y nunca lo
   * amplía. Un usuario de un solo rol lo tiene fijado en ése.
   */
  modo: Rol | null;
};
