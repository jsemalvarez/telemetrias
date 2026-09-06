# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (elección del usuario). Objetivo de despliegue: **sin decidir** — Vercel es el default natural de Next.js, pero no fue confirmado y no debe asumirse.

**Autenticación — decidido por el usuario el 2026-09-04:** propia, dentro de la misma app Next. Route handlers en `/api/auth/*`, JWT firmado con HS256, y la sesión en dos cookies httpOnly (acceso corto, refresco largo). Se descartaron explícitamente un proveedor externo (Supabase Auth) y un backend separado que emitiera el token.

**Base de datos — decidido por el usuario el 2026-09-04:** PostgreSQL. En local se levanta con Docker; en stage y producción se usa Supabase. Supabase entra como Postgres administrado: la autenticación sigue siendo la propia de la app, no Supabase Auth.

Hasta que esa base esté conectada, el padrón de usuarios está sembrado en código y aislado en un solo módulo.

## Users

Usuarios primarios: personal de las empresas cliente de Tecvol (armadores, astilleros y operadores de flota pesquera). Es un producto B2B: el cliente entra a ver su propio equipamiento, no el de Tecvol.

Conviven **varios perfiles con permisos distintos** desde el día uno, y cada uno mira el sistema con otra pregunta en la cabeza:

- **Armador / dueño**: entra poco, quiere el titular — si el buque sale a navegar cuando debe.
- **Jefe de máquinas / técnico**: convive con el equipo a diario, quiere detalle técnico y números sin simplificar.
- **Compras / proyectos del astillero**: coordina plazos, entregas y documentación.

Roles y permisos son estructurales, no una función posterior.

Los tres de arriba son **perfiles de usuario**: describen quién entra y con qué pregunta. No son los roles de permisos del sistema, que son otra cosa y los fijó el usuario el 2026-09-04.

**Roles del sistema (2026-09-04), jerárquicos — cada uno contiene al de abajo:**

- **`superadmin`**: crea clientes, y puede ser admin y encargado **de cada cliente**. Es el único rol que cruza el corte entre empresas.
- **`admin`**: lee, da de alta encargados y puede ser encargado, **de su propia empresa**.
- **`encargado`**: lee, y establece los valores mínimos y máximos que disparan las alertas de los elementos monitoreados.

*Resuelto por el usuario el 2026-09-05:* el encargado **sí** lee. Fijar un umbral sin ver la lectura que ese umbral vigila era trabajar a ciegas. Lo que distingue a `admin` de `encargado` pasa a ser el **personal** (`personal:ver` / `personal:crear`): el admin ve y da de alta a los administradores y encargados de su empresa; el encargado no. La jerarquía se mantiene —el admin conserva `umbral:definir`, así que también ve los dispositivos—, y lo que le falta al encargado es Personal.

**Identidad por correo (2026-09-05).** No hay nombre de usuario: se entra con el correo, único en todo el sistema. Una identidad sola, que además es el único lugar a donde el producto puede avisarle algo a una persona — con eso queda contestada, cuando llegue, la pregunta abierta de por qué medio se notifica una alerta de umbral. La contrapartida a saber: un encargado de buque puede no tener correo propio, y ahí quien lo da de alta le inventa uno, que sirve como identidad pero no para avisarle nada.

**Contraseña provisoria (2026-09-05).** Una cuenta creada por otro nace con la contraseña que le eligió quien la dio de alta, y el sistema lo registra como un hecho: mientras esté marcada, hay otra persona que la sabe. No obliga a cambiarla —dejar a alguien afuera de su pantalla por eso, a bordo y sin señal, es peor que el riesgo que evita—, pero lo señala en cada sesión hasta que su dueño ponga la suya. La marca se apaga en el único lugar donde alguien tipea una contraseña que nadie le dictó.

**Pantallas del panel y datos de fantasía (2026-09-05).** El panel de aplicación tiene una botonera de mandos (riel izquierdo en escritorio, faja inferior en móvil) que muestra los destinos según el permiso del modo puesto:

- **Resumen** (todos): el super ve el padrón de clientes; el admin y el encargado ven las métricas.
- **Personal** (`personal:ver`, admin y super): los administradores y encargados de la empresa, con alta y con restablecimiento de contraseña por fila. El encargado no la ve.
- **Tu credencial** (todos, fuera de la botonera): se llega desde la propia identidad en el riel.
- **Dispositivos** (`umbral:definir`, encargado, admin y super): los microcontroladores de la empresa. Hoy está vacía a propósito: el monitoreo no está instalado en ningún lado.

El padrón vive en Postgres desde el 2026-09-05, y lo que quedó sembrado es la **demostración**: una sola empresa, **Tecvol**, con `demo@tecvol.com.ar` como administrador y `encargado@tecvol.com.ar` como encargado (clave `tecvol` en ambos, pública a propósito), más un super administrador cuya credencial sale del entorno y no figura en la tarjeta del acceso. Las altas de empresa y de personal ya van a la base; la de dispositivo sigue sin tensión, porque no hay dispositivos que dar de alta.

**Quién crea y quién restablece (2026-09-06).** Se otorga todo rol cuyos permisos estén **estrictamente contenidos** en los propios. Contenidos, porque nadie reparte lo que no tiene; estrictamente, porque nadie da de alta a un par suyo. De ahí sale la tabla sin escalera codificada: el super otorga administrador y encargado, el admin otorga encargado, el encargado no otorga nada. La misma regla decide quién puede **restablecer** una contraseña ajena: quien pudo dar de alta una credencial puede reemplazarla, y ni una más. Que un super no pueda crear otro super es consecuencia de la regla y es la consecuencia correcta — la credencial que abre el padrón de todas las empresas nace de la semilla o de un script en una terminal, no de un navegador con una sesión abierta.

**Recuperación de contraseña (2026-09-06).** La hace quien administra, y no un enlace por correo. No es una etapa intermedia: es lo que le sirve a este producto. El encargado de un buque sin señal no puede seguir un enlace que le llegó a la casilla, pero sí puede llamar por radio a su administrador. Lo que sale de ahí es una contraseña provisoria —la eligió otro—, así que la marca queda encendida hasta que su dueño ponga la suya. El enlace por correo queda pendiente de que exista por dónde mandarlo; el correo de cada usuario ya está.

**La credencial propia (2026-09-06).** Cada persona administra su nombre, su correo y su contraseña, y nada más: el rol y la empresa se muestran grabados y los fija quien la administra. Cambiar el correo pide la contraseña actual, porque es cambiar con qué se entra. Cambiar la contraseña cierra las demás sesiones abiertas, que es lo que hace que cambiarla sirva de algo cuando se la cambia porque otro la sabe. Es la única pantalla que no pregunta por un permiso: todo el que entró tiene una credencial.

**El super adentro de una empresa (2026-09-06).** El super entra a un cliente desde el padrón y ahí da de alta a su personal y restablece sus contraseñas. La empresa va en la URL y no en una preferencia guardada: un «cliente activo» invisible sería un estado decidiendo sobre qué padrón se escribe, y el día que alguien diera de alta a una persona en la empresa equivocada no quedaría rastro de por qué. Se valida en cada pedido con el mismo corte de siempre, así que escribir el identificador a mano no abre nada.

Un usuario lleva **varios roles a la vez** — la lista es estructura del modelo, no un campo que se amplíe después — aunque con roles jerárquicos casi siempre alcance con uno.

De ahí salen dos reglas que valen para toda superficie futura:

1. **Se pregunta por permiso, nunca por rol** (`umbral:definir`, no `es encargado`). Un rol nuevo, o uno que cambia de alcance, se resuelve en el catálogo y no obliga a recorrer pantallas.
2. **Bajar de nivel es legítimo; subir, nunca.** Quien tiene un rol puede mirar el sistema como cualquier rol contenido en el suyo, porque eso no le da nada que no tuviera.

**Modo de vista (2026-09-04):** quien puede tomar más de una posición mira con una por vez y lo elige él, en una llave selectora del riel. El modo **recorta** el alcance al rol elegido y nunca lo amplía: se valida contra los roles reales en cada pedido, así que es una preferencia del usuario y no una credencial. Quien sólo puede tomar una posición no ve la llave.

El uso interno **quedó confirmado** el 2026-09-04, cuando el usuario definió que el `superadmin` crea los clientes: eso sólo puede hacerlo alguien de Tecvol. Lo que sigue sin establecerse es si esa administración tiene pantallas propias o se resuelve entrando como admin de cada cliente.

## Product Purpose

Dar visibilidad del **status y las métricas de equipamiento que reporta mediante microcontroladores**, y avisar cuando algo se sale de rango.

**El producto es general, no un accesorio del tablero Tecvol.** Se instala sobre cualquier elemento que necesite notificar métricas y avisar cuando está fallando; el equipo monitoreado no tiene que haber sido fabricado por Tecvol. (Corregido por el usuario el 2026-09-03, contra la versión anterior de este documento, que ataba el producto al parque propio.)

El éxito es que alguien sepa el estado real de su equipo sin llamar por teléfono ni subir a la sala de máquinas, y que sepa con la misma claridad cuándo el dato es viejo.

## Positioning

Lo que Tecvol aporta es **el oficio, no el candado**. Calcula, fabrica y monta instalaciones eléctricas navales e industriales desde 2020, y por eso sabe dónde se toma cada lectura, qué significa cuando se mueve y cuándo hay que preocuparse. Esa es la ventaja frente a un proveedor de monitoreo genérico.

Lo que **no** es la propuesta: que haya que comprarle el tablero a Tecvol para poder monitorearlo. El monitoreo se instala sobre la instalación existente, sea de quien sea.

*(Corregido por el usuario el 2026-09-03. La versión anterior decía lo contrario — que el dato sólo valía si venía de equipamiento fabricado por Tecvol — y ese encuadre había llegado a la landing. No reintroducirlo.)*

## Operating Context

- **La empresa:** Tecvol, empresa marplatense creada en 2020. Ingeniería eléctrica, construcción de tableros y montajes eléctricos navales e industriales. Lanzilota 1254, Mar del Plata, Argentina.
- **El parque instalado:** buques pesqueros (BP) y instalaciones industriales. Tableros principales de buque, tableros de control de potencia, tableros de luces de navegación y de 24 V reglamentarios **aprobados por PNA** (Prefectura Naval Argentina), sistemas de control de generación **COMAP**.
- **Dos escenas de uso que pesan igual:** se consulta en el móvil a bordo o en el astillero — pantalla chica, sol directo, manos ocupadas, conexión mala o nula — y se analiza en escritorio en la oficina. Son dos escenas a diseñar en serio, no una adaptación de la otra.
- **Los buques salen a navegar.** La pérdida de conexión es un estado normal y previsto del sistema, no una falla.
- **Idioma:** español rioplatense con voseo, tal como escribe la marca ("Contactanos", "Envianos tu mensaje y te responderemos a la brevedad"). El vocabulario del oficio — tablero, buque, jefe de máquinas, PNA, COMAP, repotenciación — es el idioma de los usuarios.

## Capabilities and Constraints

**Confirmado:**

- Los dispositivos reportan **status y métricas** vía microcontroladores.
- Múltiples perfiles de usuario con permisos diferenciados, **varios roles por usuario** y permisos derivados de los roles.
- **Varios clientes en el mismo sistema** (2026-09-04). Cada empresa ve lo suyo; sólo el rol `superadmin` cruza ese corte.
- **Alertas por umbral** (2026-09-04): los elementos monitoreados tienen valores mínimo y máximo que las disparan, y esos valores los configura un usuario con rol `encargado`. No está confirmado por qué medio se notifica una alerta.
- Autenticación propia con JWT y sesión en cookies httpOnly, dentro de la app Next (2026-09-04).
- PostgreSQL como base: Docker en local, Supabase en stage y producción (2026-09-04).
- Escritorio y móvil como escenas de primera clase, por igual.
- Stack Next.js sobre web.

**Estado del producto al 2026-09-03:** el monitoreo **no está instalado en ningún lado todavía**. Lo que existe es el parque de instalaciones que Tecvol ejecutó y el oficio para instrumentarlo. Ninguna superficie puede dar por instalado el monitoreo ni mostrar una lectura como si fuera de un equipo en servicio.

**Explícitamente sin decidir — no inventar:**

- Qué métricas concretas se reportan (tensión, corriente, temperatura, carga de generador, horas de servicio, etc.).
- Transporte y cadencia de la telemetría (MQTT/HTTP, celular/satelital, frecuencia de reporte, retención histórica).
- Por qué medio se notifica una alerta disparada (en pantalla, correo, push, mensaje). Que las alertas existen y se disparan por umbral quedó confirmado el 2026-09-04; cómo salen del sistema, no. Desde el 2026-09-06 hay un canal disponible —cada usuario tiene correo, que es además su identidad— pero elegirlo sigue sin decidirse, y no todo encargado de buque tiene casilla propia.
- Backend de telemetría y origen de datos. El **proveedor de autenticación y el motor de base de datos salieron de esta lista el 2026-09-04** (ver Stack); por dónde llegan las lecturas de los microcontroladores, no.
- Detalle del modelo multi-cliente. Que el sistema sirve a varios clientes y que sólo `superadmin` cruza el corte quedó confirmado el 2026-09-04, y cada sesión ya viaja con su cliente. **Quién da de alta a los usuarios de un cliente nuevo quedó resuelto el 2026-09-06** (ver «Quién crea y quién restablece»). Falta la política fina: qué pasa con un astillero que trabaja para varios armadores, y si un usuario puede pertenecer a más de un cliente — hoy no puede, la empresa es un campo y no una lista.
- Objetivo de despliegue.

## Brand Commitments

- **Nombre:** Tecvol.
- **Referencia vinculante:** https://tecvol.com.ar/ (WordPress + Elementor). El usuario fijó que se hereda la **identidad visual completa**: el dashboard debe leerse como parte de esa misma marca, no como un producto vecino.
- **Logo:** existe un logo vectorial (referenciado en el sitio como `LOGO-TEC-VOL-VECTOR`). **El usuario debe proveer el archivo fuente**; extraerlo del sitio en bitmap no es aceptable para producción.
- **Voz:** español rioplatense, voseo, directa y sin adornos, tal como el sitio existente.
- **Datos de contacto reales:** Lanzilota 1254, Mar del Plata, Argentina · Tel. +54 9 (0223) 489-7905 · WhatsApp +54 223 422-6722 · info@tecvol.com.ar · Instagram [@tecvol.ar](https://www.instagram.com/tecvol.ar/).

La lectura del sistema visual concreto (color, tipografía, ritmo) es trabajo posterior sobre el sitio de referencia, no de este documento.

## Evidence on Hand

**Real, verificado en tecvol.com.ar:**

- **Clientes que confían en Tecvol** (logos publicados): SPI, Acay, Moscuzza, Ártico, Solimeno.
- **Obras realizadas:** construcción eléctrica BP "Luigi" y BP "Anita"; tablero principal BP "Maria Eugenia" y BP "Luca Mario"; tablero de repotenciación BP "Don Francisco", BP "Domaio" y BP "Scirocco".
- **Servicios declarados:** diseños eléctricos navales, confección de planos, relevamiento de instalaciones existentes, diseño y desarrollo de tableros, cálculos de cortocircuito, diseño de sistemas de automatización de procesos.
- **Fotografía de obra propia** en `tecvol.com.ar/wp-content/uploads/2024/04/` (Luigi, Luigi-mando, Don-Francisco, SM, S3, S4).

**Ausencias que el trabajo futuro no debe fabricar:**

- No hay datos de telemetría reales, ni inventario de dispositivos, ni definiciones de métricas.
- No hay testimonios, precios, cifras de SLA, tiempos de respuesta ni cantidad de usuarios publicados.
- No inventar nombres de buques más allá de los siete listados, ni lecturas, ni valores de ejemplo presentados como reales.

## Product Principles

1. **Toda lectura se atribuye a un dispositivo real.** El equipo puede ser de quien sea, pero la lectura tiene que poder rastrearse hasta el aparato que la reportó y hasta cuándo la reportó. Trazabilidad, no propiedad.
2. **Sin conexión es un estado normal, no un error.** El sistema declara la edad del dato con honestidad y nunca presenta una lectura vieja como si fuera en vivo.
3. **El muelle y la oficina pesan igual.** Móvil y escritorio son dos escenas diseñadas, no una derivada de la otra.
4. **Cada cliente ve sólo su flota.** Permisos y aislamiento son estructura desde la primera pantalla, no una capa agregada.
5. **Vocabulario del oficio, sin traducir.** Tablero, buque, PNA, COMAP, jefe de máquinas. No se lima el lenguaje técnico hasta volverlo SaaS genérico.

## Accessibility & Inclusion

El usuario no fijó un estándar formal (WCAG u otro) y no debe suponerse uno.

Sí existen necesidades específicas derivadas del contexto de uso confirmado, que el diseño debe tratar como requisitos y no como mejoras: legibilidad bajo **sol directo** en cubierta, objetivos táctiles usables **con guantes**, y comportamiento correcto con **conectividad intermitente o nula**. El producto es en español; no se estableció requisito de internacionalización.
