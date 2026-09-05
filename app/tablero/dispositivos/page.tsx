import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Dispositivos } from '@/components/Dispositivos';
import { puede } from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';
import { rotuloCliente } from '@/lib/auth/usuarios';

export const metadata: Metadata = {
  title: 'Dispositivos — Monitoreo Tecvol',
  description: 'Los microcontroladores instalados en la empresa.',
  robots: { index: false, follow: false },
};

/**
 * Ruta de los dispositivos de una empresa.
 *
 * Pide `umbral:definir` —el verbo del encargado—, que por la jerarquía tienen
 * también el admin y el super. Quien no lo tiene rebota al resumen. El panel
 * está vacío a propósito: el monitoreo todavía no está instalado en ningún lado.
 */
export default async function DispositivosRuta() {
  const sesion = await sesionActual();
  if (!puede(sesion, 'umbral:definir') || !sesion) redirect('/tablero');

  return <Dispositivos empresa={rotuloCliente(sesion.cliente)} />;
}
