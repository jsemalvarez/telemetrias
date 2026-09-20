/**
 * La conexión a la base.
 *
 * Un solo cliente para todo el proceso. En desarrollo se guarda en `globalThis`
 * porque Next rehace los módulos en cada cambio: sin esto, cada recarga abre
 * otro pool y a las pocas horas de trabajo la base rechaza conexiones por
 * agotamiento —un error que aparece lejos de su causa y cuesta encontrar.
 *
 * El `import 'server-only'` rompe el build si alguien lo importa desde un
 * componente cliente. Acá adentro está la cadena de conexión con su contraseña,
 * y no puede terminar en el bundle del navegador.
 */

import 'server-only';
import { PrismaClient } from '@prisma/client';

/**
 * Cuántas conexiones abre cada instancia contra el pooler.
 *
 * El valor que Prisma recomienda para serverless es 1, y con eso estuvo hasta
 * el 2026-09-20. Ese día el primer equipo real empezó a reportar y la
 * aplicación se cayó entera: 3955 errores `P2024` en dos horas —«Timed out
 * fetching a new connection from the connection pool»— sobre `/api/lecturas`,
 * `/api/reportes` y también `/api/auth/entrar`, que es donde se vio que no era
 * un problema de la ingesta sino de todo.
 *
 * El 1 asume que una instancia atiende un pedido por vez, y no es así: Vercel
 * reutiliza la instancia y Next atiende pedidos concurrentes adentro de la
 * misma. El segundo pedido espera esa única conexión, y a los diez segundos se
 * cae. Peor: el puente reintenta cinco veces, así que cada caída se multiplica.
 *
 * Cinco y no cincuenta porque cada instancia multiplica este número y el pooler
 * tiene su propio techo. Con el modo transacción de PgBouncer las conexiones se
 * devuelven al terminar cada consulta, que es justamente lo que permite que
 * varias instancias compartan pocas conexiones reales.
 *
 * ── Por qué acá y no en la variable de entorno ────────────────────────────
 *
 * Porque el tamaño del pool no es parte del secreto. `DATABASE_URL` lleva la
 * contraseña de la base y está marcada «sensitive» en Vercel, que no la vuelve
 * a mostrar ni por su API: cambiarle un parámetro obliga a reescribirla entera,
 * y para eso hay que tener la contraseña a mano o rotarla. Un número de
 * afinado que sólo se puede tocar rotando una credencial es un número que nadie
 * va a tocar. Acá se lee, se explica y se versiona.
 */
const CONEXIONES_POR_INSTANCIA = 5;

/**
 * La cadena de conexión, con el pool dimensionado.
 *
 * Sólo toca la URL cuando va por el pooler en modo transacción, que es como se
 * la reconoce: `pgbouncer=true`. Contra el contenedor de desarrollo devuelve
 * `undefined` y Prisma usa `DATABASE_URL` tal cual — ahí la base es local, no
 * hay latencia que esconder y el límite por omisión está bien.
 */
function urlConPool(): string | undefined {
  const crudo = process.env.DATABASE_URL;
  if (!crudo) return undefined;

  let url: URL;
  try {
    url = new URL(crudo);
  } catch {
    /* Si no parsea, no es asunto de este módulo: que falle Prisma, que lo dice
       mejor. */
    return undefined;
  }

  if (url.searchParams.get('pgbouncer') !== 'true') return undefined;

  url.searchParams.set('connection_limit', String(CONEXIONES_POR_INSTANCIA));
  return url.toString();
}

const global_ = globalThis as unknown as { db?: PrismaClient };

const url = urlConPool();

export const db =
  global_.db ??
  new PrismaClient({
    ...(url ? { datasourceUrl: url } : {}),
    /* En desarrollo se ven las consultas; en producción sólo lo que salió mal,
       porque una consulta registrada lleva sus parámetros y ahí van nombres de
       usuario. */
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') global_.db = db;
