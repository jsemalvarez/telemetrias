import { alcanzaCliente, puede } from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';
import type { Sesion } from '@/lib/auth/sesion';
import { crearDispositivo, duenoDelSerial } from '@/lib/dispositivos/padron';
import { esSerial, LARGO_SERIAL, MINIMO_SERIAL, normalizarSerial } from '@/lib/dispositivos/reglas';
import { cuerpoDe, error, listo, texto, textoOpcional } from '@/lib/respuestas';

/* Prisma no corre en Edge. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Alta de un dispositivo en el padrón de una empresa.
 *
 * Pide `dispositivo:administrar`, que tienen el admin y el super y no tiene el
 * encargado. Es la decisión que separa este padrón del de umbrales: declarar
 * que se instaló un fierro no es configurar una alerta, y quien responde por el
 * parque de una empresa es su administrador. El encargado entra a la misma
 * pantalla y le fija los umbrales a lo que ya está declarado.
 *
 * La empresa puede venir en el pedido —el super da de alta adentro de una que
 * no es la suya— pero no se usa sin pasar por `alcanzaCliente`. Es la misma
 * regla que el alta de personal: el campo sólo le sirve a quien ya podía cruzar
 * el corte, y mandar el identificador de otra empresa no lleva a ningún lado.
 *
 * Sin freno de intentos, como el alta de personal: acá no hay ningún secreto
 * que se pueda adivinar repitiendo, y para llegar ya hace falta una sesión con
 * permiso. Lo que queda es el rastro, en `created_by_id`.
 */

type Cuerpo = {
  serial?: unknown;
  rotulo?: unknown;
  ubicacion?: unknown;
  cliente?: unknown;
};

export async function POST(pedido: Request) {
  const sesion = await sesionActual();

  /* Se pregunta por el permiso y no por el rol, y con el modo puesto: un admin
     que bajó la llave a encargado no declara equipos, igual que no ve el mando
     que lleva hasta acá. */
  if (!sesion || !puede(sesion, 'dispositivo:administrar')) {
    return error('permiso', 'Esta sesión no puede dar de alta dispositivos.', 403);
  }

  const leido = await cuerpoDe<Cuerpo>(pedido);
  if (!leido.ok) return leido.respuesta;

  const serial = normalizarSerial(texto(leido.cuerpo.serial));
  const rotulo = texto(leido.cuerpo.rotulo);
  const ubicacion = textoOpcional(leido.cuerpo.ubicacion);

  /* Sin `alcanzaCliente` esta línea sería el agujero por donde un
     administrador declara equipos en el padrón ajeno. */
  const cliente = texto(leido.cuerpo.cliente) || sesion.cliente;
  if (!alcanzaCliente(sesion, cliente)) {
    return error('cliente', 'Esta sesión no alcanza esa empresa.', 403);
  }

  if (!serial || !rotulo) {
    return error('faltan', 'Faltan datos: el serial y el rótulo son obligatorios.', 400);
  }

  if (!esSerial(serial)) {
    return error(
      'serial',
      `Un serial va entre ${MINIMO_SERIAL} y ${LARGO_SERIAL} caracteres, sin espacios: letras, números, guiones y puntos.`,
      400,
    );
  }

  const tomado = await duenoDelSerial(serial);
  if (tomado) return seRepite(tomado, cliente, sesion);

  try {
    const dispositivo = await crearDispositivo({
      cliente,
      serial,
      rotulo,
      ubicacion,
      creadoPor: sesion.id,
    });
    /* La misma forma que devuelve `padronDe`, para que la pantalla no traduzca. */
    return listo({ dispositivo });
  } catch (falla) {
    /* P2002 es el índice único: alguien declaró ese serial entre la consulta de
       arriba y este insert. Es raro, y es correcto que gane uno solo. */
    if (typeof falla === 'object' && falla && 'code' in falla && falla.code === 'P2002') {
      return error('repetido', 'Alguien acaba de declarar ese serial.', 409);
    }
    throw falla;
  }
}

/**
 * Qué se le contesta a quien choca contra un serial que ya está.
 *
 * Tres respuestas y no una, por la misma razón que el correo repetido del alta
 * de personal tiene dos caras: lo que se puede decir depende de hasta dónde
 * llega quien pregunta.
 *
 *   — Si el equipo es de una empresa que alcanza, se lo nombra. Ya lo tiene a
 *     la vista en su propio padrón, así que no se le cuenta nada nuevo y se le
 *     ahorra la búsqueda.
 *   — Si además está fuera de servicio, se dice eso, que es lo único que
 *     convierte el choque en algo con arreglo: está más abajo en la misma
 *     pantalla, esperando volver.
 *   — Si es de otra empresa, el mensaje se queda corto. El índice de seriales
 *     es único en todo el sistema, y decir de quién es sería contarle a un
 *     administrador qué tiene instalado el armador de al lado.
 */
function seRepite(
  tomado: { rotulo: string; cliente: string; activo: boolean },
  cliente: string,
  sesion: Sesion,
) {
  const codigo = 'serial-repetido';

  if (!alcanzaCliente(sesion, tomado.cliente)) {
    return error(codigo, 'Ese serial ya está declarado. Revisá el del equipo que tenés delante.', 409);
  }

  if (!tomado.activo) {
    return error(
      codigo,
      `Ese serial es el de «${tomado.rotulo}», que está fuera de servicio. Volvelo al servicio desde el pie del padrón en vez de declararlo de nuevo.`,
      409,
    );
  }

  return error(
    codigo,
    tomado.cliente === cliente
      ? `Ese serial ya es el de «${tomado.rotulo}».`
      : `Ese serial ya es el de «${tomado.rotulo}», en otra empresa.`,
    409,
  );
}
