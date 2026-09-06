import { NextResponse } from 'next/server';
import { hashear } from '@/lib/auth/contrasena';
import { CLAVE_MINIMA, esCorreo, normalizarCorreo } from '@/lib/auth/reglas';
import {
  ROTULO_ROL,
  alcanzaCliente,
  esRol,
  normalizarRoles,
  puede,
  rolesQueOtorga,
} from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';
import { crearMiembro, duenoDelCorreo } from '@/lib/auth/usuarios';

/* scrypt es de node:crypto: este handler no corre en Edge. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Alta de una persona en el padrón de una empresa.
 *
 * Es el alta del administrador —da de alta a los encargados que operan su
 * empresa— y también la del super parado adentro de un cliente. Dos cosas la
 * sostienen, y las dos son estructurales y no chequeos de trámite:
 *
 *   — **La empresa se decide con `alcanzaCliente`.** Puede venir en el pedido,
 *     porque el super da de alta adentro de una empresa que no es la suya, pero
 *     no se usa sin pasar por ahí: quien no cruza el corte sólo alcanza la
 *     propia, y mandar el identificador de otra no lo lleva a ningún lado.
 *     Ausente, es la de la sesión. Lo que nunca puede pasar es que un
 *     administrador siembre usuarios en el padrón de al lado, y eso lo decide
 *     el permiso, no la ausencia del campo.
 *
 *   — **El rol pedido se valida contra `rolesQueOtorga`.** Sin eso,
 *     `personal:crear` es un permiso plano y alcanza con pedir `superadmin` en
 *     el cuerpo para que un administrador se fabrique un jefe.
 *
 * No lleva freno de intentos, a diferencia de `/api/auth/entrar`: acá no hay
 * ningún secreto que se pueda adivinar repitiendo, y para llegar ya hace falta
 * una sesión con permiso. Lo que sí queda es el rastro — la fila nueva guarda
 * quién la firmó.
 */

type Cuerpo = {
  correo?: unknown;
  nombre?: unknown;
  clave?: unknown;
  roles?: unknown;
  cliente?: unknown;
};

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

  /* Se pregunta por el permiso y no por el rol, y con el modo puesto: un admin
     que bajó la llave a encargado no da altas, igual que no ve la pantalla que
     lleva hasta acá. */
  if (!sesion || !puede(sesion, 'personal:crear')) {
    return error('permiso', 'Esta sesión no puede dar de alta personal.', 403);
  }

  let cuerpo: Cuerpo;
  try {
    cuerpo = await pedido.json();
  } catch {
    return error('cuerpo', 'No se pudo leer el pedido.', 400);
  }

  const correo = normalizarCorreo(texto(cuerpo.correo));
  const nombre = texto(cuerpo.nombre);
  const clave = typeof cuerpo.clave === 'string' ? cuerpo.clave : '';

  /* La empresa del alta. Sin `alcanzaCliente` esta línea sería el agujero por
     donde un administrador escribe en el padrón ajeno; con ella, el campo sólo
     le sirve a quien ya podía cruzar el corte. */
  const cliente = texto(cuerpo.cliente) || sesion.cliente;
  if (!alcanzaCliente(sesion, cliente)) {
    return error('cliente', 'Esta sesión no alcanza esa empresa.', 403);
  }

  if (!correo || !nombre || !clave) {
    return error('faltan', 'Faltan datos: hay que completar los tres bornes.', 400);
  }

  if (!esCorreo(correo)) {
    return error('correo', 'Eso no es una dirección de correo.', 400);
  }

  if (clave.length < CLAVE_MINIMA) {
    return error('clave', `La contraseña tiene que ser de ${CLAVE_MINIMA} caracteres o más.`, 400);
  }

  /* Que sean roles del catálogo es una cuestión de forma. Que esta sesión pueda
     otorgarlos es la que importa, y se decide en el bloque siguiente. */
  const crudos = Array.isArray(cuerpo.roles) ? cuerpo.roles : [];
  if (!crudos.length || !crudos.every(esRol)) {
    return error('roles', 'Hay que decir con qué rol entra, y tiene que ser uno conocido.', 400);
  }
  const roles = normalizarRoles(crudos);

  const otorgables = rolesQueOtorga(sesion);
  const prohibido = roles.find((rol) => !otorgables.includes(rol));
  if (prohibido) {
    return error(
      'rol',
      `Esta sesión no puede dar de alta a un ${ROTULO_ROL[prohibido].toLowerCase()}.`,
      403,
    );
  }

  /* Se pregunta antes para poder dar un mensaje que sirva; el índice único de
     la base es el que decide de verdad, más abajo. */
  const tomado = await duenoDelCorreo(correo);
  if (tomado) {
    /* Si esa dirección es de alguien de la misma empresa, quien pregunta ya lo
       tiene a la vista en su propio padrón: nombrarlo no le cuenta nada que no
       pudiera ver, y le ahorra la búsqueda. Si es de otra, el mensaje se queda
       corto a propósito — el índice de correos es único en todo el sistema, y
       decir de quién es sería contarle el padrón ajeno a alguien que no cruza
       ese corte. */
    const alcanza = tomado.cliente === cliente || puede(sesion, 'cliente:cruzar');
    return error(
      'correo-repetido',
      alcanza
        ? `Ese correo ya es el de ${tomado.nombre}.`
        : 'Ese correo ya está tomado. Probá con otro.',
      409,
    );
  }

  const hash = await hashear(clave);

  try {
    const miembro = await crearMiembro({
      cliente,
      correo,
      nombre,
      hash,
      roles,
      creadoPor: sesion.id,
    });

    /* La misma forma que devuelve `personalDe`, para que la pantalla pueda
       mostrar la fila nueva sin traducir nada. */
    return NextResponse.json({ ok: true, miembro }, { headers: SIN_CACHE });
  } catch (falla) {
    /* P2002 es el índice único: alguien tomó ese correo entre la consulta de
       arriba y este insert. Es raro, y es correcto que gane uno solo. */
    if (typeof falla === 'object' && falla && 'code' in falla && falla.code === 'P2002') {
      return error('repetido', 'Alguien acaba de tomar ese correo.', 409);
    }
    throw falla;
  }
}
