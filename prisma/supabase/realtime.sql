-- Lo que hay que tener aplicado en el proyecto de Supabase para que el canal
-- del panel funcione.
--
-- **No es una migración de Prisma, y no puede serlo.** `realtime.messages` es
-- una tabla del propio Supabase, en un esquema que la base local no tiene:
-- una migración de Prisma que la referenciara fallaría en cada máquina de
-- desarrollo. Así que vive acá, versionada, y se aplica contra el proyecto.
--
-- Aplicada el 2026-09-06 al proyecto `monitoreo-iot` (ref qwomheymjmodbaaegkvu)
-- como la migración `canal_por_empresa`. Si algún día la base de la aplicación
-- se muda a Supabase, esto puede pasar a ser una migración normal.
--
-- ---------------------------------------------------------------------------
--
-- El aislamiento entre empresas es la promesa central del producto, y ésta es
-- la única cerradura que la hace cumplir Supabase y no la aplicación. Por eso
-- es una sola comparación y no un join: el tópico se llama `cliente:<empresa>`
-- y el token que presenta el navegador trae esa empresa en un claim. Si no
-- coinciden, no entra.
--
-- El token lo emite la aplicación, firmado con su clave ES256, y recién DESPUÉS
-- de correr `alcanzaCliente`. **El corte de verdad sigue viviendo en
-- TypeScript**: esto no reimplementa el criterio de quién alcanza qué empresa,
-- sólo verifica que el portador de un token no se cambie de tópico. Es la
-- segunda vuelta de llave sobre la misma puerta, no una segunda puerta.
--
-- **Sólo SELECT.** La ausencia de una política de INSERT es la parte deliberada:
-- un navegador que pudiera publicar en el canal podría inventar lecturas que
-- los demás verían como si vinieran de un equipo. Publicar es un acto del
-- servidor, con la clave de servicio, y de nadie más.
--
-- Además hay que dejar apagado «Allow public access» en Realtime Settings. Sin
-- eso los canales privados no se hacen valer y esta política no gobierna nada.

create policy "empresa recibe su propio topico"
on realtime.messages
for select
to authenticated
using (
  realtime.topic() = 'cliente:' || (current_setting('request.jwt.claims', true)::json ->> 'cliente')
);
