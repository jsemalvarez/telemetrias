import { conDispositivo } from '@/lib/dispositivos/guarda';
import { crearMagnitud } from '@/lib/dispositivos/padron';
import { aClave, aUmbral, escalaValida, umbralValido } from '@/lib/dispositivos/reglas';
import { cuerpoDe, error, listo, texto, textoOpcional } from '@/lib/respuestas';

/* Prisma no corre en Edge. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Alta de una magnitud sobre un dispositivo.
 *
 * Pide `dispositivo:administrar` y no `umbral:definir`, y ése es el corte fino
 * de todo esto: **qué mide un equipo es parte del equipo, no de la alerta.** Lo
 * sabe quien lo instaló y lo declara quien responde por el parque. El encargado
 * llega después y le pone el mínimo y el máximo a lo que ya está declarado —eso
 * sí es suyo, y va por la ruta de al lado—.
 *
 * La clave con la que el fierro va a nombrar esta magnitud en su mensaje se
 * deriva del rótulo acá adentro, igual que el identificador de una empresa sale
 * de su nombre. Lo que manda el navegador es lo que la persona escribió; una
 * clave que llegara de afuera sería un campo que alguien elige a mano, y con
 * ese campo se decide a qué fila entra una lectura.
 *
 * El alta admite umbrales de una vez. No es una concesión: quien declara que un
 * equipo mide temperatura de bobinado normalmente sabe hasta cuánto aguanta, y
 * obligarlo a guardar y volver a entrar es ceremonia. Puede dejarlos vacíos y
 * los fija el encargado.
 */

type Cuerpo = {
  rotulo?: unknown;
  unidad?: unknown;
  min?: unknown;
  max?: unknown;
  escalaMin?: unknown;
  escalaMax?: unknown;
};

export async function POST(pedido: Request, { params }: { params: { id: string } }) {
  const guarda = await conDispositivo(params.id, 'dispositivo:administrar');
  if (!guarda.ok) return guarda.respuesta;

  const leido = await cuerpoDe<Cuerpo>(pedido);
  if (!leido.ok) return leido.respuesta;

  const rotulo = texto(leido.cuerpo.rotulo);
  const unidad = textoOpcional(leido.cuerpo.unidad);

  if (!rotulo) return error('faltan', 'Hay que decir qué mide.', 400);

  /* De un rótulo sin letras ni números no sale ninguna clave, y sin clave la
     magnitud no se puede nombrar en un mensaje. */
  if (!aClave(rotulo)) {
    return error(
      'rotulo',
      'De ese rótulo no sale ninguna clave. Tiene que llevar al menos una letra o un número.',
      400,
    );
  }

  const min = aUmbral(leido.cuerpo.min);
  const max = aUmbral(leido.cuerpo.max);
  if (min === undefined || max === undefined) {
    return error('umbral', 'El mínimo y el máximo tienen que ser números, o quedar vacíos.', 400);
  }

  if (!umbralValido(min, max)) {
    return error('umbral', 'El mínimo no puede ser mayor que el máximo.', 400);
  }

  /* La escala del instrumento, que no son los umbrales. Entra por acá porque
     hasta dónde llega un medidor es parte del equipo, como su unidad. */
  const escalaMin = aUmbral(leido.cuerpo.escalaMin);
  const escalaMax = aUmbral(leido.cuerpo.escalaMax);
  if (escalaMin === undefined || escalaMax === undefined) {
    return error('escala', 'La escala tiene que ser dos números, o quedar vacía.', 400);
  }

  /* Las dos o ninguna: medio arco no se puede dibujar. La base lo vuelve a
     exigir con su propio CHECK, que es donde no se puede saltear. */
  if (!escalaValida(escalaMin, escalaMax)) {
    return error(
      'escala',
      'La escala va con los dos extremos, y el de abajo tiene que ser menor que el de arriba. Vacía quiere decir que esta magnitud no se dibuja con aguja.',
      400,
    );
  }

  const magnitud = await crearMagnitud(guarda.dato.id, {
    rotulo,
    unidad,
    min,
    max,
    escalaMin,
    escalaMax,
  });
  return listo({ magnitud });
}
