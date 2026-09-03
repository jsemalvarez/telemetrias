---
version: 1
slug: "app-tablero-page-tsx"
primary_target: "app/tablero/page.tsx"
related_targets: []
---

# Tablero — el registrador de faja de la flota

## Scope

Ruta `/tablero` de la app Next.js: la pantalla de operación del monitoreo. No cubre acceso ni gestión de cuentas (eso vive en `app-login-page-tsx`), ni administración interna de Tecvol.

**Visitor mode:** Operate.

## Audiencia y trabajo

Los tres perfiles entran con preguntas distintas y la misma pantalla las tiene que responder a distinta profundidad:

- **Jefe de máquinas** (diario): quiere ver de dónde viene el número, no sólo cuánto vale. Es el lector de las trazas.
- **Armador** (esporádico): quiere el titular — si el buque sale a navegar. Lee la columna de la flota y nada más.
- **Compras / astillero**: quiere el registro para justificar un trabajo. Lee la historia y la edad del dato.

## Alcance de datos confirmado

Ronda de preguntas del 2026-09-03: **ahora + alarmas + historia**; el set de métricas actual **más el estado de maniobra** (qué generador está en barra, posición de los −Q); y cada usuario ve **la flota de su empresa**, varios buques de un solo cliente.

## Estado de la demo

Sin backend, sin transporte de telemetría y sin retención real. Las trazas son un registro **sintético determinista** (misma semilla en servidor y cliente) y el valor vivo sale del único `ProveedorVivo` del mundo. Todo se declara como demostración en pantalla; los nombres de buque sí son reales.

## Direction contract

THESIS: El tablero es un registrador de faja: la historia es la estructura, no una pestaña detrás de un filtro. Rechaza la grilla de tarjetas de KPI.

OWN-WORLD: DESIGN.md sin retoques — chapa empernada, hueco rebajado, bisel proa/rebaje, Sora en versales, naranja sólo donde hay señal. Designaciones nuevas sobre el esquema existente: −R1 registrador, −S3 selector de flota, −Q5/−Q6 interruptores de generador.

STORY: El jefe de máquinas ve de dónde viene el valor y no sólo cuánto vale; el armador ve la lámpara del buque; los dos ven el corte de enlace porque el papel queda literalmente en blanco.

FIRST VIEWPORT: Cabecera −R1 con buque cargado y edad del dato. Izquierda, la flota como plumas cargadas. Derecha, cuatro canales a todo el ancho — −P1, −P2, −P3, −P7 — cada traza terminando contra su ventana rebajada. Eje común de 24 h al pie y, montada encima, la maniobra: sinóptico G1/G2 y estado de los −Q. Firma: la regla de lectura arrastrable y con teclado. Movimiento: sólo la pluma, 0.85 s.

FORM: El registrador de faja, #5 de mi lista ordenada de siete, seed c195ee55.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Momento memorable

El papel en blanco. Cuando un buque pierde el enlace, la traza se corta en el minuto del último reporte y el resto de la faja queda vacío hasta la pluma apagada. No hay cartel de error: el instrumento dice la verdad con la misma tinta con la que dice todo lo demás.

## Decisiones abiertas

Retención real de la historia (hoy 24 h sintéticas a 10 min de paso). Umbrales de alarma: los cuatro límites dibujados son de demostración y Tecvol tiene que fijarlos. Multi-tenencia: la flota está cableada a una sola empresa; si un usuario puede tener más de un cliente hace falta un selector previo. Sin backend, sin transporte y sin destino de despliegue.
