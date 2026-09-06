import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Dispositivos } from '@/components/Dispositivos';
import { puede } from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';
import { rotuloCliente } from '@/lib/auth/usuarios';
import { padronDe } from '@/lib/dispositivos/padron';

export const metadata: Metadata = {
  title: 'Dispositivos — Monitoreo Tecvol',
  description: 'Los microcontroladores declarados en la empresa.',
  robots: { index: false, follow: false },
};

/**
 * Ruta de los dispositivos de una empresa.
 *
 * Pide `umbral:definir` —el verbo del encargado—, que por la jerarquía tienen
 * también el admin y el super. Quien no lo tiene rebota al resumen.
 *
 * Y pregunta una segunda vez, por `dispositivo:administrar`, para saber si esta
 * sesión además declara equipos o solamente les fija umbrales. Son dos
 * preguntas y no una porque son dos actos distintos sobre la misma pantalla: el
 * encargado entra, ve todo y escribe los umbrales; el administrador entra, ve
 * lo mismo y además declara los fierros. Ninguna de las dos pregunta por un rol.
 */
export default async function DispositivosRuta() {
  const sesion = await sesionActual();
  if (!sesion || !puede(sesion, 'umbral:definir')) redirect('/tablero');

  const padron = await padronDe(sesion.cliente);

  return (
    <Dispositivos
      empresa={await rotuloCliente(sesion.cliente)}
      cliente={sesion.cliente}
      enServicio={padron.enServicio}
      fueraDeServicio={padron.fueraDeServicio}
      puedeAdministrar={puede(sesion, 'dispositivo:administrar')}
    />
  );
}
