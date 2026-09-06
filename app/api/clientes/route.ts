import { NextResponse } from 'next/server';
import { hashear } from '@/lib/auth/contrasena';
import { CLAVE_MINIMA, esCorreo, normalizarCorreo } from '@/lib/auth/reglas';
import { puede } from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';
import { db } from '@/lib/db';
import { aIdentificador } from '@/lib/identificador';

/* scrypt es de node:crypto: este handler no corre en Edge. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Alta de una empresa, con su primer administrador.
 *
 * Las dos cosas en un solo pedido y una sola transacción, a propósito: una
 * empresa sin administrador no la puede abrir nadie —no hay quien entre a
 * darle de alta el personal— y queda como una fila muerta que alguien tiene
 * que ir a limpiar a mano. Si el alta es de las dos o de ninguna, ese estado
 * no existe.
 *
 * El identificador no viaja en el pedido: se deriva del nombre acá. Lo que
 * manda el navegador es lo que el usuario escribió, y nada más — un id que
 * llegara de afuera sería un campo que alguien puede elegir a mano.
 */

type Cuerpo = { empresa?: unknown; admin?: unknown };
type Admin = { correo?: unknown; nombre?: unknown; clave?: unknown };

const SIN_CACHE = { 'Cache-Control': 'no-store' };

function error(codigo: string, mensaje: string, estado: number) {
  return NextResponse.json(
    { ok: false, error: codigo, mensaje },
    { status: estado, headers: SIN_CACHE },
  );
}

const texto = (valor: unknown) => (typeof valor === 'string' ? valor.trim() : '');

export async function POST(pedido: Request) {
  const sesion = await sesionActual();

  /* Se pregunta por el permiso y no por el rol. El middleware ya garantizó que
     hay sesión; lo que se decide acá es si esa sesión alcanza, y con el modo
     puesto: un super que bajó la llave a encargado no da altas, igual que no
     ve el mando que lleva a esta pantalla. */
  if (!sesion || !puede(sesion, 'cliente:crear')) {
    return error('permiso', 'Esta sesión no puede dar de alta empresas.', 403);
  }

  let cuerpo: Cuerpo;
  try {
    cuerpo = await pedido.json();
  } catch {
    return error('cuerpo', 'No se pudo leer el pedido.', 400);
  }

  const empresa = texto(cuerpo.empresa);
  const admin: Admin = (cuerpo.admin ?? {}) as Admin;
  const correo = normalizarCorreo(texto(admin.correo));
  const nombre = texto(admin.nombre);
  const clave = typeof admin.clave === 'string' ? admin.clave : '';

  if (!empresa || !correo || !nombre || !clave) {
    return error('faltan', 'Faltan datos: hay que completar los cuatro bornes.', 400);
  }

  if (!esCorreo(correo)) {
    return error('correo', 'Eso no es una dirección de correo.', 400);
  }

  const id = aIdentificador(empresa);
  if (!id) {
    return error(
      'identificador',
      'De ese nombre no sale ningún identificador. Tiene que llevar al menos una letra o un número.',
      400,
    );
  }

  if (clave.length < CLAVE_MINIMA) {
    return error('clave', `La contraseña tiene que ser de ${CLAVE_MINIMA} caracteres o más.`, 400);
  }

  /* Se pregunta antes para poder decir cuál de los dos choca; el índice único
     de la base es el que decide de verdad, más abajo. */
  const [empresaTomada, usuarioTomado] = await Promise.all([
    db.client.findUnique({ where: { id }, select: { label: true } }),
    db.user.findUnique({ where: { email: correo }, select: { id: true } }),
  ]);

  if (empresaTomada) {
    return error(
      'empresa-repetida',
      /* El rótulo va primero: puesto al final, una razón social que termina en
         punto —«S.A.»— deja el mensaje con dos. */
      `«${empresaTomada.label}» ya tiene el identificador «${id}».`,
      409,
    );
  }
  if (usuarioTomado) {
    /* Quien está de este lado cruza el corte entre empresas, así que decirle en
       cuál está tomada esa dirección no le revela nada que no pueda ver. El
       alta de personal, que la hace un admin, no puede ser igual de explícita. */
    return error('correo-repetido', `Ya hay un usuario con el correo «${correo}».`, 409);
  }

  const hash = await hashear(clave);

  try {
    const creado = await db.$transaction(async (tx) => {
      const cliente = await tx.client.create({ data: { id, label: empresa } });
      await tx.user.create({
        data: {
          email: correo,
          name: nombre,
          hash,
          clientId: cliente.id,
          /* La contraseña la eligió el super, no su dueño: la cuenta nace con
             la marca puesta y el admin ve la lámpara hasta que ponga la suya. */
          provisionalPassword: true,
          createdById: sesion.id,
          roles: { create: [{ role: 'admin' }] },
        },
      });
      return cliente;
    });

    return NextResponse.json(
      {
        ok: true,
        /* La misma forma que devuelve `clientes()`, para que la pantalla pueda
           mostrar la fila nueva sin traducir nada. Un administrador es un
           usuario, así que la cuenta arranca en uno. */
        cliente: { id: creado.id, rotulo: creado.label, usuarios: 1 },
      },
      { headers: SIN_CACHE },
    );
  } catch (falla) {
    /* P2002 es el índice único: alguien dio el alta entre la consulta de arriba
       y este insert. Es raro y es correcto que gane uno solo. */
    if (typeof falla === 'object' && falla && 'code' in falla && falla.code === 'P2002') {
      return error('repetido', 'Alguien acaba de dar de alta ese identificador o ese correo.', 409);
    }
    throw falla;
  }
}
