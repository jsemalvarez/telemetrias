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
- **`admin`**: lee, da de alta encargados, declara los dispositivos y puede ser encargado, **de su propia empresa**.
- **`encargado`**: lee, y establece los valores mínimos y máximos que disparan las alertas de los elementos monitoreados.

*Resuelto por el usuario el 2026-09-05:* el encargado **sí** lee. Fijar un umbral sin ver la lectura que ese umbral vigila era trabajar a ciegas. Lo que distingue a `admin` de `encargado` pasa a ser el **personal** (`personal:ver` / `personal:crear`): el admin ve y da de alta a los administradores y encargados de su empresa; el encargado no. La jerarquía se mantiene —el admin conserva `umbral:definir`, así que también ve los dispositivos—, y lo que le falta al encargado es Personal. *Ampliado el 2026-09-06:* le falta además declarar equipos (`dispositivo:administrar`), que es el segundo corte entre los dos roles y va en la misma dirección — el admin puede todo lo que puede el encargado, y un poco más.

**Identidad por correo (2026-09-05).** No hay nombre de usuario: se entra con el correo, único en todo el sistema. Una identidad sola, que además es el único lugar a donde el producto puede avisarle algo a una persona — con eso queda contestada, cuando llegue, la pregunta abierta de por qué medio se notifica una alerta de umbral. La contrapartida a saber: un encargado de buque puede no tener correo propio, y ahí quien lo da de alta le inventa uno, que sirve como identidad pero no para avisarle nada.

**Contraseña provisoria (2026-09-05).** Una cuenta creada por otro nace con la contraseña que le eligió quien la dio de alta, y el sistema lo registra como un hecho: mientras esté marcada, hay otra persona que la sabe. No obliga a cambiarla —dejar a alguien afuera de su pantalla por eso, a bordo y sin señal, es peor que el riesgo que evita—, pero lo señala en cada sesión hasta que su dueño ponga la suya. La marca se apaga en el único lugar donde alguien tipea una contraseña que nadie le dictó.

**Pantallas del panel y datos de fantasía (2026-09-05).** El panel de aplicación tiene una botonera de mandos (riel izquierdo en escritorio, faja inferior en móvil) que muestra los destinos según el permiso del modo puesto:

- **Resumen** (todos): el super ve el padrón de clientes; el admin y el encargado ven **el panel de lecturas** (−A6, desde el 2026-09-06): los equipos en servicio de su empresa, cada magnitud con su instrumento y la edad de su último reporte. Hasta ese día mostraba el registrador de demostración, porque no había lecturas reales que mostrar.
- **Demostración** (`lectura:ver`, fuera de la botonera): el registrador de faja completo —tablero, flota, sinóptico— con datos declarados como sintéticos. Se llega desde el pie del panel. Vive detrás de una ruta con su nombre y no en la primera pantalla: a quien entra a ver el estado de un equipo no se lo recibe con un tablero que no existe. Se conserva porque es el frente que este producto va a poder dibujar cuando haya parque instrumentado, y es la referencia contra la que se mide lo que se construya.
- **Personal** (`personal:ver`, admin y super): los administradores y encargados de la empresa, con alta y con restablecimiento de contraseña por fila. El encargado no la ve.
- **Tu credencial** (todos, fuera de la botonera): se llega desde la propia identidad en el riel.
- **Dispositivos** (`umbral:definir`, encargado, admin y super): los microcontroladores de la empresa, con sus magnitudes y sus umbrales. Desde el 2026-09-06 tiene alta, corrección y baja (ver «El padrón de dispositivos»), y desde ese mismo día muestra lo que cada equipo reportó: la última lectura por magnitud y su edad, y nada más — sin gráfico y sin histórico, porque no hay datos que los llenen. Un dispositivo declarado sigue sin ser un dispositivo reportando, y la pantalla lo dice al pie.

El padrón vive en Postgres desde el 2026-09-05, y lo que quedó sembrado es la **demostración**: una sola empresa, **Tecvol**, con `demo@tecvol.com.ar` como administrador y `encargado@tecvol.com.ar` como encargado (clave `tecvol` en ambos, pública a propósito), más un super administrador cuya credencial sale del entorno y no figura en la tarjeta del acceso. Las altas de empresa, de personal y de dispositivo ya van a la base. Lo que no hay sembrado es ningún dispositivo: el padrón nace vacío en las dos empresas, porque inventar un inventario de equipos instalados sería exactamente lo que este documento prohíbe.

**Quién crea y quién restablece (2026-09-06).** Se otorga todo rol cuyos permisos estén **estrictamente contenidos** en los propios. Contenidos, porque nadie reparte lo que no tiene; estrictamente, porque nadie da de alta a un par suyo. De ahí sale la tabla sin escalera codificada: el super otorga administrador y encargado, el admin otorga encargado, el encargado no otorga nada. La misma regla decide quién puede **restablecer** una contraseña ajena: quien pudo dar de alta una credencial puede reemplazarla, y ni una más. Que un super no pueda crear otro super es consecuencia de la regla y es la consecuencia correcta — la credencial que abre el padrón de todas las empresas nace de la semilla o de un script en una terminal, no de un navegador con una sesión abierta.

**Recuperación de contraseña (2026-09-06).** La hace quien administra, y no un enlace por correo. No es una etapa intermedia: es lo que le sirve a este producto. El encargado de un buque sin señal no puede seguir un enlace que le llegó a la casilla, pero sí puede llamar por radio a su administrador. Lo que sale de ahí es una contraseña provisoria —la eligió otro—, así que la marca queda encendida hasta que su dueño ponga la suya. El enlace por correo queda pendiente de que exista por dónde mandarlo; el correo de cada usuario ya está.

**La credencial propia (2026-09-06).** Cada persona administra su nombre, su correo y su contraseña, y nada más: el rol y la empresa se muestran grabados y los fija quien la administra. Cambiar el correo pide la contraseña actual, porque es cambiar con qué se entra. Cambiar la contraseña cierra las demás sesiones abiertas, que es lo que hace que cambiarla sirva de algo cuando se la cambia porque otro la sabe. Es la única pantalla que no pregunta por un permiso: todo el que entró tiene una credencial.

**El super adentro de una empresa (2026-09-06).** El super entra a un cliente desde el padrón y ahí administra su personal y sus dispositivos: da de alta, restablece contraseñas y declara equipos, todo en la empresa donde está parado. La empresa va en la URL y no en una preferencia guardada: un «cliente activo» invisible sería un estado decidiendo sobre qué padrón se escribe, y el día que alguien diera de alta a una persona en la empresa equivocada no quedaría rastro de por qué. Se valida en cada pedido con el mismo corte de siempre, así que escribir el identificador a mano no abre nada.

**El padrón de dispositivos (2026-09-06).** Un dispositivo es el microcontrolador que se instala sobre el equipo para que reporte. El padrón dice qué hay declarado, de quién es, qué mide y entre qué valores se lo vigila — y no dice ni una lectura.

*El umbral no vive en el dispositivo.* Un microcontrolador reporta varias magnitudes —tensión de barra, corriente, temperatura de bobinado, factor de potencia— y cada una tiene su mínimo y su máximo. Un par de valores en la fila del dispositivo es un modelo que se sostiene sólo mientras cada instalación mida una sola cosa. Es **dispositivo 1—N magnitudes**, y el umbral cuelga de la magnitud.

*Cuáles son esas magnitudes sigue sin decidirse, y por eso son dato y no esquema.* Una magnitud se da de alta como se da de alta un dispositivo: alguien escribe qué mide y en qué unidad. No hay lista fija de métricas en ningún lado, que es la única forma de no decidir por descuido lo que este documento dejó abierto a propósito.

*El mínimo y el máximo pueden faltar, cada uno por su lado.* Una temperatura de bobinado se vigila por arriba y nada más. Vacío quiere decir «por ese lado no se vigila», que no es lo mismo que cero, que quiere decir «avisame si baja de cero».

*El dispositivo tiene una identidad que él mismo reporta:* un serial, único en todo el sistema. Es lo que va a permitir atribuir un mensaje entrante a una fila cuando exista el transporte — llegue como llegue, llega diciendo eso y nada que la aplicación haya elegido. Único en todo el sistema y no por empresa, porque el mensaje llega antes de que nadie sepa de quién es.

*Las bajas no borran.* Un equipo sale de servicio y sigue apareciendo en el padrón, abajo, hasta que vuelva: sus umbrales son trabajo hecho, y su serial sigue tomado porque es el mismo fierro. Que la vuelta esté a un clic es lo que hace que la baja no necesite ceremonia — lo peligroso no es darla, es no poder deshacerla.

**Quién declara un equipo (2026-09-06).** El encargado **fija umbrales**; el administrador **declara los fierros**. Instalar un equipo no es configurar una alerta, y quien responde por el parque de una empresa es su administrador. De ahí sale un permiso nuevo, `dispositivo:administrar`, que tienen el admin y el super: gobierna el alta, la corrección, la baja de un dispositivo y también el alta de una magnitud, porque **qué mide un equipo es parte del equipo**. Lo que queda del lado del encargado, con `umbral:definir`, es entrar a la pantalla, ver el padrón entero y escribir los mínimos y los máximos. Se llama `administrar` y no `crear` porque gobierna tres actos: un permiso llamado `crear` que autoriza una baja miente en el catálogo, que es el único lugar donde alguien va a ir a leer qué puede cada rol.

**La ingesta de telemetría (2026-09-06).** El padrón dejó de ser lo único que el sistema sabe: ya hay por dónde entran las mediciones. El camino quedó decidido así — microcontrolador por MQTT hasta un broker Mosquitto, y de ahí un proceso puente que reporta por REST a la aplicación.

El proceso del medio existe porque **Mosquitto no habla HTTP por sí solo**: es un broker MQTT puro, sin webhooks ni motor de reglas, a diferencia de EMQX o HiveMQ. Alguien tiene que suscribirse a los tópicos y hacer el pedido, y ese alguien es el puente. Todavía no está escrito, y la aplicación no lo espera: el contrato es HTTP y cualquier cosa que hable HTTP lo cumple, empezando por Postman.

*Quien se autentica contra la aplicación es el puente, y no cada dispositivo.* Cae directo de la forma de arriba: lo que llega a la app es un solo proceso. Es una credencial de servicio; el equipo se autentica contra el broker, con su usuario y su clave MQTT, que es otra capa. Lo que eso implica queda escrito y no escondido: **esa credencial puede reportar en nombre de cualquier serial declarado.** Lo que la acota es que sólo puede escribir mediciones — no lee, no borra, no toca el padrón. Perdida, es alguien escribiendo lecturas falsas, que se ve y se corta rotando la clave; si además leyera, perdida sería el aislamiento entero del producto. Por eso la lectura de mediciones pide sesión de persona y no acepta esa clave: dos actos distintos, dos permisos distintos, aunque compartan la dirección.

*Dos marcas de tiempo, no una.* El equipo dice cuándo midió; el servidor anota cuándo recibió. Es lo único que permite contestar después, con honestidad, qué tan viejo es un dato — que es el segundo principio de este documento. Los buques salen a navegar, se quedan sin señal y descargan quince días juntos al volver a rango: con una sola fecha, ese lote se lee como si se hubiera medido todo al llegar. La pantalla mide la edad contra la fecha del equipo, porque la medición es vieja aunque haya llegado recién, y dice aparte cuándo llegó cuando las dos se separan de veras.

*Serial desconocido: se rechaza y no se guarda nada.* El padrón es la fuente de verdad. Una lectura de un equipo que nadie declaró no tiene dueño, ni empresa, ni unidad contra la cual significar algo: guardarla sería fabricar una fila que ninguna pantalla puede mostrar y que nadie puede atribuir. Es el primer principio de este documento aplicado a la puerta de entrada.

*Clave no declarada: se ignora esa clave y el resto entra.* Un firmware que reporta un campo de más no puede costarle al buque las otras siete lecturas del mismo mensaje. Lo ignorado vuelve en la respuesta con su motivo, para que el puente lo registre: es la única forma de que alguien se entere de que un equipo viene diciendo algo que nadie está escuchando.

*Un equipo fuera de servicio que reporta: la lectura se guarda igual.* El fierro está hablando y negarlo no lo hace callar; perder esas lecturas sería además perder justo las del equipo que alguien está por revisar. Lo que cambia es dónde se ve —la pantalla lo sigue mostrando abajo, entre los que están fuera de servicio— y la respuesta se lo dice al puente, porque un equipo dado de baja hace un mes que sigue reportando es un dato sobre la instalación y no sobre el software.

*Un reintento no duplica nada.* MQTT entrega al menos una vez, y un puente al que se le venció el pedido vuelve a mandar lo mismo sin saber si entró. La identidad de una medición es su magnitud y su instante, así que el reintento choca y no suma. Sin eso, cada reintento duplicaría una lectura en silencio y todo promedio posterior saldría mal, sin nada en pantalla que lo sugiriera.

*El umbral no se evalúa al guardar.* Guardar una lectura y disparar una alerta son dos actos, y por qué medio sale una alerta sigue sin decidirse en este documento. La ingesta no compara contra el mínimo y el máximo, ni deja nada preparado para hacerlo: inventar ahí un canal de notificación sería contestar de taquito lo que quedó abierto a propósito.

**El panel de lecturas (2026-09-06).** La primera superficie del producto donde todo lo que se ve lo dijo un fierro. Muestra los equipos **en servicio** de la empresa, cada magnitud con su instrumento y la edad de su número. Un equipo dado de baja que igual reporta se guarda y se ve en el padrón, abajo; mostrarlo entre los activos sería contradecir a quien lo dio de baja.

*La escala del instrumento no son los umbrales, y por eso son dos pares de números.* Los umbrales dicen entre qué valores se vigila; la escala dice de dónde a dónde llega la esfera. Ninguno sirve de reemplazo del otro: una temperatura de bobinado alarma arriba de 75 y no tiene mínimo útil, así que de sus umbrales no sale piso para el arco; una tensión vigilada entre 385 y 420 tiene que poder mostrar 380 sin tirar la aguja afuera, que es justo el valor que alguien necesita ver. La escala la declara quien declara la magnitud, con el mismo permiso: hasta dónde llega un medidor es parte del equipo, como su unidad.

*Sin escala declarada no hay aguja, y sin lectura tampoco.* Una magnitud sin escala se dibuja como lectura digital — no se inventa un recorrido a partir de los datos que fueron llegando, porque eso movería la cara del instrumento abajo de la aguja cada vez que apareciera un extremo nuevo, y un instrumento que se recalibra solo no es un instrumento. Y una magnitud que nunca reportó muestra la esfera sin aguja: una aguja apoyada en el cero se lee como una medición de cero, y «no reportó nada» y «reportó cero» son dos hechos distintos que no pueden verse iguales.

*Fuera de rango se pinta y no se notifica.* La aguja roja dice un hecho que ya está en pantalla. No sale nada del sistema: por qué medio se avisa una alerta sigue sin decidirse, y pintar una aguja no lo decide. Es la misma línea que sostiene la ingesta — **mostrar no es alertar**.

**Cómo se actualiza el panel (2026-09-06).** Por consulta periódica del estado completo, y es la decisión correcta para la forma que tiene este despliegue.

*La cadencia la pide el dato, no el reloj.* El sondeo va a un segundo mientras algo se mueve y afloja hasta cinco cuando la respuesta viene igual a la anterior, volviendo a un segundo en cuanto cambia algo. Un pedido por segundo sostenido son unas 3.600 invocaciones por hora **y por pantalla abierta**, y en serverless eso se paga —además de dos consultas a la base cada vez— para traer casi siempre lo mismo que ya estaba en pantalla. Un tablero de buque no cambia sesenta veces por minuto. El tope de reposo es de cinco segundos y no de treinta porque ese número es lo peor que puede tardar en verse el primer cambio después de una pausa, y quien gira una perilla no puede quedarse medio minuto mirando una aguja quieta.
 Con la aplicación en Vercel, un flujo abierto desde el servidor (SSE) le dejaría a cada pantalla una instancia de función tomada, con tope de duración, así que se cortaría solo. Lo que corresponde cuando esté Supabase es **empuje por Broadcast**, con un tópico por empresa: ahí el socket lo sostiene Supabase y no la aplicación, y el corte entre empresas se resuelve con una sola comparación —¿este token puede unirse a este tópico?— en vez de una política por fila.

*Lo que se descartó y por qué:* suscribirse a los cambios de la tabla desde el navegador (Postgres Changes) obligaría a evaluar una política por fila y por suscriptor sobre la tabla que más crece, y —más importante— sería **una segunda implementación del corte por empresa, escrita en SQL, que tendría que coincidir para siempre con la de la aplicación.**

*Y la consulta periódica no se tira cuando llegue el empuje:* baja su cadencia y queda como la resincronización. Un canal que se cortó no sabe qué se perdió mientras estuvo caído; una foto del estado completo no necesita saberlo. En un producto donde quedarse sin señal es un estado normal, ese piso no es opcional.

*Perder el enlace es un estado y no un error.* El panel lo declara y sigue mostrando lo último que llegó, con la edad corriendo. La edad se mide contra el reloj del servidor, que viaja con los datos: una tablet a bordo con la hora corrida mostraría, si no, lecturas de ayer o del futuro.

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
- **Alertas por umbral** (2026-09-04): los elementos monitoreados tienen valores mínimo y máximo que las disparan, y esos valores los configura un usuario con rol `encargado`. No está confirmado por qué medio se notifica una alerta. *Precisado el 2026-09-06:* el umbral es de una **magnitud** y no de un dispositivo, y cada lado —mínimo o máximo— puede faltar. *Y el mismo día se fijó el límite:* el panel **muestra** en rojo el valor que quedó afuera del rango declarado, y con eso no sale nada del sistema. Mostrar no es alertar, y pintar una aguja no decide por qué medio se avisa.
- **Padrón de dispositivos** (2026-09-06): los microcontroladores se dan de alta, se corrigen y se dan de baja, por empresa, con una identidad de hardware única y sus magnitudes declaradas como dato (ver «El padrón de dispositivos»).
- **Transporte de la telemetría** (2026-09-06): MQTT hasta un broker Mosquitto, y de ahí un proceso puente que reporta por REST a la aplicación. Contra la aplicación se autentica el puente, no cada equipo (ver «La ingesta de telemetría»).
- **Panel de lecturas** (2026-09-06): las mediciones se ven, por equipo y por magnitud, con instrumento de aguja donde hay escala declarada y con la edad de cada dato. Se actualiza por consulta periódica del estado completo (ver «Cómo se actualiza el panel»).
- **Ingesta y guardado de mediciones** (2026-09-06): las lecturas entran por un endpoint propio, cuelgan de la magnitud —que es lo que tiene unidad y umbral— y llevan dos fechas, la del equipo y la del servidor. Leerlas es otro acto, con sesión de persona y el mismo corte por empresa que todo lo demás.
- Autenticación propia con JWT y sesión en cookies httpOnly, dentro de la app Next (2026-09-04).
- PostgreSQL como base: Docker en local, Supabase en stage y producción (2026-09-04).
- Escritorio y móvil como escenas de primera clase, por igual.
- Stack Next.js sobre web.

**Estado del producto al 2026-09-03:** el monitoreo **no está instalado en ningún lado todavía**. Lo que existe es el parque de instalaciones que Tecvol ejecutó y el oficio para instrumentarlo. Ninguna superficie puede dar por instalado el monitoreo ni mostrar una lectura como si fuera de un equipo en servicio.

**Explícitamente sin decidir — no inventar:**

- Qué métricas concretas se reportan (tensión, corriente, temperatura, carga de generador, horas de servicio, etc.). **Sigue sin decidirse, y desde el 2026-09-06 el sistema está construido para que siga así:** una magnitud es una fila que alguien da de alta, no un valor de un enum ni una columna. Decidirlo no va a costar una migración; no decidirlo tampoco cuesta nada.
- Cadencia y retención de la telemetría: cada cuánto reporta un equipo, por qué enlace físico sale el mensaje (celular, satelital) y cuánto tiempo se conserva una medición. **El transporte salió de esta lista el 2026-09-06** (ver Confirmado): lo que se decidió es por dónde llega el mensaje, no cada cuánto llega ni hasta cuándo se guarda. Lo último va a importar antes de lo que parece, porque es la única tabla del sistema que crece sin techo.
- Por qué medio se notifica una alerta disparada (en pantalla, correo, push, mensaje). Que las alertas existen y se disparan por umbral quedó confirmado el 2026-09-04; cómo salen del sistema, no. Desde el 2026-09-06 hay un canal disponible —cada usuario tiene correo, que es además su identidad— pero elegirlo sigue sin decidirse, y no todo encargado de buque tiene casilla propia.
- El **empuje** del dato al navegador: falta escribirlo, no elegirlo. Quedó decidido el 2026-09-06 que va a ser Supabase Broadcast con un tópico por empresa (ver «Cómo se actualiza el panel»); lo que no está es el proyecto de Supabase, ni la política que autoriza el tópico, ni el token corto que la aplicación tiene que emitir para que el navegador se una. Mientras tanto el panel se actualiza por consulta periódica, que es también la resincronización que ese canal va a necesitar igual.
- Detalle del modelo multi-cliente. Que el sistema sirve a varios clientes y que sólo `superadmin` cruza el corte quedó confirmado el 2026-09-04, y cada sesión ya viaja con su cliente. **Quién da de alta a los usuarios de un cliente nuevo quedó resuelto el 2026-09-06** (ver «Quién crea y quién restablece»). Falta la política fina: qué pasa con un astillero que trabaja para varios armadores, y si un usuario puede pertenecer a más de un cliente — hoy no puede, la empresa es un campo y no una lista.
- Detalle del despliegue. **La intención quedó declarada el 2026-09-06** y ya hay decisiones apoyadas en ella: la aplicación en Vercel, y el broker MQTT como un servicio aparte —Railway u otro similar— con el proceso puente reportando por REST. No está ejecutado y no hay proyecto de Supabase todavía, así que lo que falta es hacerlo, no elegirlo. Lo que esa forma ya decidió es cómo se actualiza el panel: serverless descarta un flujo abierto desde el servidor (ver «Cómo se actualiza el panel»).

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
