import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Personal } from '@/components/Personal';
import { puede } from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';
import { personalDe, rotuloCliente } from '@/lib/auth/usuarios';

export const metadata: Metadata = {
  title: 'Personal — Monitoreo Tecvol',
  description: 'Los administradores y encargados de la empresa.',
  robots: { index: false, follow: false },
};

/**
 * Ruta del personal de una empresa.
 *
 * El middleware ya garantizó que hay sesión. Acá se decide el permiso: quien no
 * tiene `personal:ver` no ve esta pantalla en la botonera, y si llega por la URL
 * directa rebota al resumen. No se pregunta por el rol, se pregunta por el
 * permiso, así que sumar un rol nuevo no obliga a volver a tocar esto.
 */
export default async function PersonalRuta() {
  const sesion = await sesionActual();
  if (!puede(sesion, 'personal:ver') || !sesion) redirect('/tablero');

  return (
    <Personal
      empresa={await rotuloCliente(sesion.cliente)}
      personal={await personalDe(sesion.cliente)}
      puedeCrear={puede(sesion, 'personal:crear')}
    />
  );
}
