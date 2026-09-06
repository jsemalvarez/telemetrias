import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Personal } from '@/components/Personal';
import { alcanzaCliente, puede, rolesQueOtorga } from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';
import { clienteEnServicio, personalDe, rotuloCliente } from '@/lib/auth/usuarios';
import { hermanasDe } from '@/lib/navegacion';

export const metadata: Metadata = {
  title: 'Personal del cliente — Monitoreo Tecvol',
  description: 'El padrón de personal de una empresa.',
  robots: { index: false, follow: false },
};

/**
 * El personal de un cliente, mirado desde afuera.
 *
 * Ésta es la pieza que le faltaba al super: hasta acá podía ver el padrón de
 * empresas pero no pararse adentro de ninguna. Bajaba la llave a administrador
 * y seguía siendo administrador de Tecvol, así que el personal que diera de
 * alta caía en Tecvol y no en la empresa que estaba mirando.
 *
 * Vive bajo su segmento —`/personal`— desde que la empresa tiene dos pantallas.
 * Dos pantallas hermanas con dos formas de URL distintas se leen como si una
 * fuera la principal y la otra un anexo, y no lo son: son las dos caras del
 * mismo cliente. La ruta sin segmento sigue existiendo y redirige acá.
 *
 * **La empresa va en la URL y no en una cookie.** Un «cliente activo» guardado
 * en algún lado sería un estado invisible decidiendo sobre qué padrón se
 * escribe, y el día que alguien diera de alta a una persona en la empresa
 * equivocada no quedaría rastro de por qué. Acá se lee, se comparte y se
 * vuelve atrás con el botón del navegador.
 *
 * Y se valida en cada pedido con `alcanzaCliente`, que es el mismo corte que
 * usa todo lo demás: quien no cruza el corte entre empresas no llega, aunque
 * escriba el identificador a mano en la barra de direcciones.
 */
export default async function PersonalDelClienteRuta({ params }: { params: { id: string } }) {
  const sesion = await sesionActual();
  if (!sesion) redirect('/login');

  /* Se pregunta por el permiso, no por el rol. Y con el modo puesto: un super
     que bajó la llave a administrador deja de cruzar el corte, así que tampoco
     entra por acá — es la misma sesión mirando con menos alcance. */
  if (!alcanzaCliente(sesion, params.id)) redirect('/tablero');

  /* Y por el permiso de la pantalla, que hasta acá faltaba: un encargado de
     Tecvol cruza `alcanzaCliente` para Tecvol —es su propia empresa— y estaba
     entrando por esta URL al padrón de personal que /tablero/personal le
     niega. La misma pantalla contestaba distinto según por dónde se llegara.
     El corte entre empresas nunca estuvo abierto; el que faltaba era éste. */
  if (!puede(sesion, 'personal:ver')) redirect('/tablero');

  if (!(await clienteEnServicio(params.id))) notFound();

  return (
    <Personal
      empresa={await rotuloCliente(params.id)}
      cliente={params.id}
      personal={await personalDe(params.id)}
      otorgables={puede(sesion, 'personal:crear') ? rolesQueOtorga(sesion) : []}
      yo={sesion.id}
      volver={{ href: '/tablero', rotulo: 'Padrón de clientes' }}
      hermanas={hermanasDe(sesion, params.id, 'personal')}
    />
  );
}
