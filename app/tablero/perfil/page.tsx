import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Perfil } from '@/components/Perfil';
import { sesionActual } from '@/lib/auth/servidor';
import { rotuloCliente } from '@/lib/auth/usuarios';

export const metadata: Metadata = {
  title: 'Tu credencial — Monitoreo Tecvol',
  description: 'Tus datos y tu contraseña.',
  robots: { index: false, follow: false },
};

/**
 * Tu credencial.
 *
 * Es la única ruta de la aplicación que no pregunta por un permiso, y no por
 * descuido: todo el que entró tiene una credencial, y nadie necesita
 * habilitación para administrar la suya. Por eso tampoco está en la botonera —
 * los mandos son las pantallas del producto, y esto es de la persona, no del
 * producto. Se llega desde el riel, tocando la propia identidad.
 */
export default async function PerfilRuta() {
  const sesion = await sesionActual();

  /* El middleware ya rebotó a quien no tiene sesión. Esto es el cinturón: si
     algún día esta ruta sale del matcher, no queda una pantalla de credencial
     colgada sin nadie adentro. */
  if (!sesion) redirect('/login');

  return <Perfil sesion={sesion} empresa={await rotuloCliente(sesion.cliente)} />;
}
