---
version: 1
slug: "app-login-page-tsx"
primary_target: "app/login/page.tsx"
related_targets: ["app/tablero/page.tsx"]
---

# Acceso — pantalla de entrada al monitoreo

## Scope

Ruta `/login` de la app Next.js, más su destino provisorio `/tablero`. No cubre el dashboard, que se construye en otra tanda, ni ninguna gestión de cuentas.

**Visitor mode:** Operate.

## Audiencia y trabajo

Jefe de máquinas, armador o responsable de astillero con credenciales que **le entregó Tecvol**. No hay alta, ni autogestión, ni recuperación de contraseña: quien no tiene clave la pide. El trabajo de la pantalla es dejarlo pasar rápido y decirle con claridad qué hacer si no puede.

## Estado de la demo

Nada está desplegado. La pantalla valida contra **una credencial de demostración visible en pantalla**, para que la validación y el error se vean funcionando delante del cliente. No es autenticación: es una compuerta de demo, y el código lo dice donde vive.

## Direction contract

THESIS: El acceso es una regleta: usuario y contraseña son dos bornes numerados y entrar es dar tensión al circuito. Rechaza la tarjeta de login centrada sobre fondo difuso.

OWN-WORLD: El mundo de DESIGN.md sin retoques — chapa empernada, hueco rebajado, bisel proa/rebaje, Sora en versales, naranja sólo donde hay señal. Extiende el esquema de designaciones con −X0 para los bornes de acceso y −Q0 para la llave de habilitación.

STORY: El usuario reconoce la regleta del tablero que ya conoce, entiende que sólo dos bornes están cableados, escribe en esos dos y pasa. Si no tiene credencial, la chapa de al lado le dice a quién pedirla.

FIRST VIEWPORT: Regleta horizontal cruzando el centro a lo ancho, con exactamente tres bloques que la llenan: −X0:1 usuario, −X0:2 contraseña y la habilitación −Q0 al extremo derecho, donde entra la alimentación. Debajo, dos chapas: credencial de demostración a la izquierda, cómo pedir acceso a la derecha.

FORM: La bornera de acceso, #7 de mi lista ordenada de siete, seed 8af58d33.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Momento memorable

Dos bornes y una llave llenando el riel entero: sin una palabra, la pantalla dice que entrar es una operación de dos datos y nada más.

El 2026-09-03 se quitó la regleta numerada sin cablear que acompañaba a los dos bornes. Era decoración legible para un jefe de máquinas y ruido para un armador, y esta pantalla la usan los dos. La composición de regleta se mantiene; lo que se fue es el adorno.

## Decisiones abiertas

Sin backend ni proveedor de autenticación. Multi-tenencia sin definir: si un usuario puede tener más de un cliente, esta pantalla va a necesitar un selector de flota al entrar. Recuperación de acceso resuelta hoy por WhatsApp, que es el canal real de Tecvol.
