import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Personal } from '@/components/Personal';
import { puede, rolesQueOtorga } from '@/lib/auth/roles';
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

  /* Se pregunta por el permiso —nunca por el rol— y recién después por qué
     roles puede repartir esta sesión. Sin `personal:crear` no hay alta, aunque
     la jerarquía dejara otorgar algo; con el permiso, el alcance lo fija
     `rolesQueOtorga` y la pantalla no vuelve a decidirlo. */
  const otorgables = puede(sesion, 'personal:crear') ? rolesQueOtorga(sesion) : [];

  return (
    <Personal
      empresa={await rotuloCliente(sesion.cliente)}
      personal={await personalDe(sesion.cliente)}
      otorgables={otorgables}
      yo={sesion.id}
    />
  );
}
