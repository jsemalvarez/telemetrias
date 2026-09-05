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

const global_ = globalThis as unknown as { db?: PrismaClient };

export const db =
  global_.db ??
  new PrismaClient({
    /* En desarrollo se ven las consultas; en producción sólo lo que salió mal,
       porque una consulta registrada lleva sus parámetros y ahí van nombres de
       usuario. */
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') global_.db = db;
