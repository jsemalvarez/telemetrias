import { alcanzaCliente } from '@/lib/auth/roles';
import { conDispositivo } from '@/lib/dispositivos/guarda';
import { duenoDelSerial, editarDispositivo } from '@/lib/dispositivos/padron';
import { esSerial, LARGO_SERIAL, MINIMO_SERIAL, normalizarSerial } from '@/lib/dispositivos/reglas';
import { cuerpoDe, error, listo, texto, textoOpcional } from '@/lib/respuestas';

/* Prisma no corre en Edge. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Corrección de los datos de un dispositivo.
 *
 * El serial entra por acá porque tiene que poder corregirse: se tipea copiando
 * una chapita en una sala de máquinas, con poca luz y el equipo andando, y ahí
 * se erra. Un serial mal cargado no es un dato feo — es el dispositivo que
 * nunca va a poder atribuirse su propia lectura.
 *
 * La empresa no entra. Un fierro no se muda de armador desde un formulario, y
 * si algún día eso hace falta va a ser un acto con su propio nombre, su propio
 * permiso y su propio rastro. Acá el `clientId` ni se lee.
 */

type Cuerpo = { serial?: unknown; rotulo?: unknown; ubicacion?: unknown };

export async function PATCH(pedido: Request, { params }: { params: { id: string } }) {
  const guarda = await conDispositivo(params.id, 'dispositivo:administrar');
  if (!guarda.ok) return guarda.respuesta;

  const leido = await cuerpoDe<Cuerpo>(pedido);
  if (!leido.ok) return leido.respuesta;

  const serial = normalizarSerial(texto(leido.cuerpo.serial));
  const rotulo = texto(leido.cuerpo.rotulo);
  const ubicacion = textoOpcional(leido.cuerpo.ubicacion);

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

  /* El serial es único en todo el sistema, así que corregirlo puede chocar
     contra otro equipo — y contra uno que quien corrige no puede ver. El
     mensaje se queda corto en ese caso, como en el alta: decir de quién es
     sería contarle el padrón ajeno a alguien que no cruza ese corte. */
  const tomado = await duenoDelSerial(serial);
  if (tomado && tomado.id !== guarda.dato.id) {
    return error(
      'serial-repetido',
      alcanzaCliente(guarda.sesion, tomado.cliente)
        ? `Ese serial ya es el de «${tomado.rotulo}».`
        : 'Ese serial ya está declarado. Revisá el del equipo que tenés delante.',
      409,
    );
  }

  try {
    const dispositivo = await editarDispositivo(guarda.dato.id, { serial, rotulo, ubicacion });
    return listo({ dispositivo });
  } catch (falla) {
    if (typeof falla === 'object' && falla && 'code' in falla && falla.code === 'P2002') {
      return error('repetido', 'Alguien acaba de declarar ese serial.', 409);
    }
    throw falla;
  }
}
