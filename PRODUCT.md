# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (elección del usuario). Objetivo de despliegue: **sin decidir** — Vercel es el default natural de Next.js, pero no fue confirmado y no debe asumirse.

## Users

Usuarios primarios: personal de las empresas cliente de Tecvol (armadores, astilleros y operadores de flota pesquera). Es un producto B2B: el cliente entra a ver su propio equipamiento, no el de Tecvol.

Conviven **varios perfiles con permisos distintos** desde el día uno, y cada uno mira el sistema con otra pregunta en la cabeza:

- **Armador / dueño**: entra poco, quiere el titular — si el buque sale a navegar cuando debe.
- **Jefe de máquinas / técnico**: convive con el equipo a diario, quiere detalle técnico y números sin simplificar.
- **Compras / proyectos del astillero**: coordina plazos, entregas y documentación.

Roles y permisos son estructurales, no una función posterior.

**Sin confirmar:** si el propio equipo de Tecvol usa el sistema con una vista interna o de administración. Es probable, pero no fue establecido.

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
- Múltiples perfiles de usuario con permisos diferenciados.
- Escritorio y móvil como escenas de primera clase, por igual.
- Stack Next.js sobre web.

**Estado del producto al 2026-09-03:** el monitoreo **no está instalado en ningún lado todavía**. Lo que existe es el parque de instalaciones que Tecvol ejecutó y el oficio para instrumentarlo. Ninguna superficie puede dar por instalado el monitoreo ni mostrar una lectura como si fuera de un equipo en servicio.

**Explícitamente sin decidir — no inventar:**

- Qué métricas concretas se reportan (tensión, corriente, temperatura, carga de generador, horas de servicio, etc.).
- Transporte y cadencia de la telemetría (MQTT/HTTP, celular/satelital, frecuencia de reporte, retención histórica).
- Si hay alarmas, umbrales o notificaciones dentro del alcance.
- Backend, base de datos, origen de datos y proveedor de autenticación.
- Modelo de multi-tenencia. La combinación de clientes B2B y permisos **implica** que cada cliente sólo debe ver su propia flota; el límite exacto de aislamiento no está confirmado y hay que establecerlo antes de modelar datos.
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
