import 'server-only';
import { importJWK, SignJWT, type JWK } from 'jose';

/**
 * El canal en vivo: cómo el navegador se entera de una medición sin preguntar.
 *
 * El empuje lo hace **Supabase Realtime Broadcast**, con un tópico por empresa
 * (`cliente:tecvol`). El socket lo sostiene Supabase y no esta aplicación, que
 * es lo que hace que funcione igual corriendo en una notebook que en Vercel —
 * en serverless no hay proceso largo que pueda sostener una conexión abierta.
 *
 * ── Quién puede escuchar qué ───────────────────────────────────────────────
 *
 * El navegador se une al canal con un token que emite este módulo, y ese token
 * se emite **después** de que el handler corrió `alcanzaCliente`. El corte de
 * verdad sigue viviendo en TypeScript, donde vive todo el resto: la política
 * sobre `realtime.messages` (ver `prisma/supabase/realtime.sql`) sólo verifica
 * que el portador no se cambie de tópico. Dos vueltas de llave sobre la misma
 * puerta, y no dos criterios que algún día van a discrepar.
 *
 * Por eso el token lleva **un solo dato de dominio**: la empresa. No lleva
 * roles, ni permisos, ni el id del usuario. Cuanto menos diga, menos hay que
 * mantener sincronizado con `lib/auth/roles.ts` — y lo único que habilita es
 * escuchar un tópico. No habilita publicar: para eso no hay política, a
 * propósito, porque un navegador que pudiera publicar inventaría lecturas.
 *
 * ── Por qué ES256 y no el secreto compartido ───────────────────────────────
 *
 * Se firma con una clave asimétrica propia, generada de este lado e importada
 * en el proyecto como clave de firma. Supabase la verifica contra su JWKS.
 *
 * La alternativa era el «JWT Secret» heredado, y se descartó por dos razones
 * concretas: en este proyecto ya está relegado a «Previously used» —o sea, a un
 * clic de que alguien lo revoque y el canal deje de andar sin que nadie entienda
 * por qué—, y además ese mismo secreto firma el `service_role` heredado, con lo
 * cual sirve para mucho más que esto. La clave de acá sirve para una sola cosa.
 *
 * ── Si no está configurado ─────────────────────────────────────────────────
 *
 * Devuelve `null`, y la pantalla se queda con la consulta periódica. Es a
 * propósito: el empuje es una mejora sobre un piso que funciona, no un
 * requisito para que el panel ande. Una notebook sin las variables de Supabase
 * sigue mostrando lecturas.
 */

/**
 * Cuánto vive el token.
 *
 * Una hora: bastante para que una pantalla abierta no lo renueve todo el
 * tiempo, y poco para que uno filtrado no sirva mañana. Quien deja el panel
 * abierto más que eso lo renueva sin enterarse — el hook lo pide de nuevo antes
 * de que venza.
 */
const VIDA_MS = 60 * 60 * 1000;

/** Lo que el navegador necesita para unirse. Nada de esto es secreto. */
export type Canal = {
  url: string;
  /** La clave publicable del proyecto: viaja al navegador por diseño. */
  clavePublica: string;
  /** El tópico de esta empresa, y el único al que este token puede unirse. */
  topico: string;
  token: string;
  /** Cuándo vence, para que el navegador lo renueve antes. */
  venceEn: number;
};

/** El nombre del tópico de una empresa. Lo arman los dos lados, así que va acá. */
export const topicoDe = (cliente: string) => `cliente:${cliente}`;

/* La clave importada se guarda entre pedidos: importarla es criptografía y no
   hace falta repetirla en cada pantalla que se abre. */
let clave: Promise<CryptoKey | Uint8Array> | null = null;

function jwkDelEntorno(): JWK | null {
  const crudo = process.env.SUPABASE_FIRMA_JWK?.trim();
  if (!crudo) return null;
  try {
    return JSON.parse(crudo) as JWK;
  } catch {
    console.error('[canal] SUPABASE_FIRMA_JWK no es un JSON válido.');
    return null;
  }
}

/**
 * ¿Está configurado el empuje?
 *
 * Lo pregunta la ingesta antes de publicar, para no armar un pedido que no
 * tiene a dónde ir.
 */
export function hayCanal(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_CLAVE_PUBLICA &&
      process.env.SUPABASE_FIRMA_JWK,
  );
}

/**
 * El pase para escuchar el canal de una empresa.
 *
 * **No decide nada sobre permisos.** Quien llama ya pasó por `alcanzaCliente`;
 * este módulo firma lo que le piden. Está escrito así a propósito: si además
 * consultara la sesión, habría dos lugares decidiendo el corte.
 */
export async function canalDe(cliente: string): Promise<Canal | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const clavePublica = process.env.NEXT_PUBLIC_SUPABASE_CLAVE_PUBLICA?.trim();
  const jwk = jwkDelEntorno();

  if (!url || !clavePublica || !jwk || !jwk.kid) return null;

  clave ??= importJWK(jwk, 'ES256');
  const venceEn = Date.now() + VIDA_MS;

  /* `role` tiene que ser un rol de Postgres que exista —la política se declaró
     para `authenticated`— y es lo que Realtime mira para decidir con qué rol
     evalúa la política. No es un rol de este producto: los nuestros viven en
     lib/auth/roles.ts y no salen de la aplicación. */
  const token = await new SignJWT({ role: 'authenticated', cliente })
    .setProtectedHeader({ alg: 'ES256', kid: jwk.kid, typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(venceEn / 1000))
    .sign(await clave);

  return { url, clavePublica, topico: topicoDe(cliente), token, venceEn };
}

/**
 * Avisa por el canal de una empresa que llegaron lecturas nuevas.
 *
 * **El mensaje no lleva la medición.** Lleva el serial del equipo que habló, y
 * la pantalla vuelve a pedir el panel. Es una decisión y conviene tenerla
 * escrita:
 *
 *   — Un mensaje que llevara el valor tendría que llevar también la magnitud,
 *     su unidad, sus umbrales y su escala para poder dibujarse, o la pantalla
 *     tendría que fusionarlo contra lo que ya tiene. Eso es un segundo formato
 *     de datos que mantener en sincronía con `panelDe`.
 *   — Y lo que sigue siendo verdad es que el canal se corta. Si el dibujo
 *     dependiera de haber recibido todos los mensajes, una reconexión dejaría
 *     la pantalla mintiendo. Así, el canal sólo dice «mirá de nuevo», y quien
 *     mira siempre trae el estado entero.
 *
 * El costo es un pedido más por evento. A cambio, el canal puede perder
 * mensajes sin que nadie se entere de nada raro, que en este producto no es un
 * caso de borde: es el martes a la mañana.
 *
 * No lanza si falla. Un aviso que no salió es una pantalla que se actualiza un
 * segundo más tarde por sondeo; tirar el POST de la ingesta por eso sería
 * perder una medición para no perder una notificación.
 */
export async function avisarLecturas(cliente: string, serial: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const servicio = process.env.SUPABASE_CLAVE_SERVICIO?.trim();
  if (!url || !servicio) return;

  try {
    const respuesta = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: servicio },
      body: JSON.stringify({
        messages: [
          {
            topic: topicoDe(cliente),
            event: 'lecturas',
            payload: { serial },
            /* Privado, como el canal al que se une el navegador: un mensaje
               público no llega a un canal privado, y al revés tampoco. */
            private: true,
          },
        ],
      }),
    });
    if (!respuesta.ok) {
      console.error(`[canal] el aviso no salió: ${respuesta.status}`);
    }
  } catch (falla) {
    const causa = (falla as { cause?: { message?: string; code?: string } }).cause;
    console.error(
      `[canal] el aviso no salió: ${(falla as Error).message}` +
        (causa ? ` | causa: ${causa.code ?? causa.message}` : ""),
    );
  }
}
