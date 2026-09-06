import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Dispositivos } from '@/components/Dispositivos';
import { alcanzaCliente, puede } from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';
import { clienteEnServicio, rotuloCliente } from '@/lib/auth/usuarios';
import { padronDe } from '@/lib/dispositivos/padron';
import { hermanasDe } from '@/lib/navegacion';

export const metadata: Metadata = {
  title: 'Dispositivos del cliente — Monitoreo Tecvol',
  description: 'El padrón de dispositivos de una empresa.',
  robots: { index: false, follow: false },
};

/**
 * Los dispositivos de una empresa, mirados desde afuera.
 *
 * Espejo de la ruta de personal que ya existía, y con la misma regla: **la
 * empresa va en la URL y no en una cookie.** Un «cliente activo» guardado en
 * algún lado sería un estado invisible decidiendo sobre qué padrón se escribe,
 * y el día que alguien declarara un equipo en la empresa equivocada no quedaría
 * rastro de por qué. Acá se lee, se comparte y se vuelve atrás con el botón del
 * navegador.
 *
 * Se valida en cada pedido con `alcanzaCliente`, que es el mismo corte que usa
 * todo lo demás: quien no lo cruza no llega, aunque escriba el identificador a
 * mano en la barra de direcciones.
 *
 * Cuando se escribió la pantalla de personal por cliente, esta ruta se dejó
 * afuera a propósito: eran treinta líneas, pero llevaban a un panel vacío por
 * decisión de producto, y una ruta que no muestra nada no se gana el lugar. Ya
 * muestra algo.
 */
export default async function DispositivosDelClienteRuta({
  params,
}: {
  params: { id: string };
}) {
  const sesion = await sesionActual();
  if (!sesion) redirect('/login');

  /* Se pregunta por el permiso, no por el rol. Y con el modo puesto: un super
     que bajó la llave a encargado deja de cruzar el corte y tampoco entra. */
  if (!alcanzaCliente(sesion, params.id)) redirect('/tablero');
  if (!puede(sesion, 'umbral:definir')) redirect('/tablero');

  /* «No existe» y «no la alcanzás» son dos respuestas distintas, y ese orden es
     el que importa: el corte se decide antes de mirar la base, así que a nadie
     le sirve esta ruta para averiguar qué identificadores de empresa existen. */
  if (!(await clienteEnServicio(params.id))) notFound();

  const padron = await padronDe(params.id);

  return (
    <Dispositivos
      empresa={await rotuloCliente(params.id)}
      cliente={params.id}
      enServicio={padron.enServicio}
      fueraDeServicio={padron.fueraDeServicio}
      puedeAdministrar={puede(sesion, 'dispositivo:administrar')}
      volver={{ href: '/tablero', rotulo: 'Padrón de clientes' }}
      hermanas={hermanasDe(sesion, params.id, 'dispositivos')}
    />
  );
}
