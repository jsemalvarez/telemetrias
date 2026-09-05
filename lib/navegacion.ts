import { puede, type Permiso } from './auth/roles';
import type { Sesion } from './auth/sesion';

/** Los símbolos grabados que la botonera sabe dibujar. */
export type Simbolo = 'resumen' | 'personal' | 'dispositivos';

export type Destino = {
  href: string;
  rotulo: string;
  simbolo: Simbolo;
  /** Sin permiso declarado, el destino es de cualquiera que tenga sesión. */
  permiso?: Permiso;
};

/**
 * Los destinos del panel, en el orden en que se montan en la botonera.
 *
 * Es un catálogo, no una pantalla. Un destino nuevo se agrega acá con su permiso
 * y la botonera lo muestra a quien corresponda sin tocar nada más. Se declara el
 * permiso, nunca el rol: es la misma regla que sostiene `puede`, aplicada a la
 * navegación.
 *
 * El Resumen no lleva permiso: lo ve cualquiera con sesión, y lo que muestra lo
 * decide la propia pantalla según lo que ese usuario puede (el padrón de
 * clientes para quien cruza el corte, las métricas para quien las lee).
 * Dispositivos pide `umbral:definir`, así que lo ven el encargado y —por la
 * jerarquía— también el admin y el super. Personal pide `personal:ver`, que el
 * encargado no tiene: ése es el corte que los separa.
 */
export const DESTINOS: Destino[] = [
  { href: '/tablero', rotulo: 'Resumen', simbolo: 'resumen' },
  { href: '/tablero/personal', rotulo: 'Personal', simbolo: 'personal', permiso: 'personal:ver' },
  {
    href: '/tablero/dispositivos',
    rotulo: 'Dispositivos',
    simbolo: 'dispositivos',
    permiso: 'umbral:definir',
  },
];

/**
 * Los destinos que este usuario alcanza con el modo que tiene puesto.
 *
 * El corte entre empresas es otra altura: quien lo cruza está mirando el padrón
 * de clientes, no una empresa en particular, y las pantallas por-empresa
 * (Personal, Dispositivos) no tienen a qué empresa referirse. Así que ahí el
 * único mando es el Resumen. Cuando el super baja a un modo de empresa con la
 * llave −S1, deja de cruzar y las pantallas por-empresa aparecen solas.
 */
export function destinosDe(sesion: Sesion | null): Destino[] {
  if (!sesion) return [];
  if (puede(sesion, 'cliente:cruzar')) return DESTINOS.filter((d) => !d.permiso);
  return DESTINOS.filter((d) => !d.permiso || puede(sesion, d.permiso));
}
