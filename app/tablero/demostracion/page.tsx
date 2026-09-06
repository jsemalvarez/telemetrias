import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Registrador } from '@/components/Registrador';
import { puede } from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';

export const metadata: Metadata = {
  title: 'Demostración — Monitoreo Tecvol',
  description: 'El tablero de demostración, con datos de fantasía declarados como tales.',
  robots: { index: false, follow: false },
};

/**
 * El tablero de demostración.
 *
 * Vivía en el Resumen mientras no había lecturas reales que mostrar, y ahí
 * estaba bien: era eso o una pantalla vacía. Desde que la ingesta existe, el
 * Resumen muestra lo que hay de verdad y esto se muda acá, entero y sin
 * cambios.
 *
 * No es un descarte. Es el frente completo —registrador de faja, sinóptico,
 * medidores, pilotos— que este producto va a poder dibujar cuando un buque
 * tenga el parque instrumentado, y sirve para dos cosas que el panel real
 * todavía no puede: mostrarle a alguien a dónde va esto, y ser la referencia de
 * diseño contra la que se mide lo que se vaya construyendo.
 *
 * **Sus datos son inventados y el propio registrador lo declara en pantalla**,
 * que es la única condición bajo la cual esto puede existir: PRODUCT.md prohíbe
 * presentar una lectura sintética sin su etiqueta. Por eso vive detrás de una
 * ruta con su nombre y no en la primera pantalla — a la que se entra a ver el
 * estado de un equipo no se la recibe con un tablero que no existe.
 *
 * Pide `lectura:ver`, el mismo permiso que el Resumen: quien puede mirar
 * mediciones puede mirar esto.
 */
export default async function DemostracionRuta() {
  const sesion = await sesionActual();
  if (!sesion || !puede(sesion, 'lectura:ver')) redirect('/tablero');

  return <Registrador />;
}
