---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: []
---

# Landing — plataforma de monitoreo Tecvol

## Scope

Ruta `/` de la app Next.js. Landing única del producto de monitoreo de telemetría. No cubre el dashboard en sí ni el sitio institucional de tecvol.com.ar, que sigue vivo aparte.

**Visitor mode:** Persuade.

## Audiencia y trabajo

Armador o jefe de máquinas de flota pesquera marplatense, ya cliente de Tecvol o a punto de serlo. Llega sabiendo quién es Tecvol; no sabe que sus tableros pueden reportar. Acción única: **pedir una demo**. Sin acción secundaria de igual peso.

## Prueba disponible

Siete obras reales con nombre de buque, cinco logos de clientes, fotografía de obra propia, aprobaciones PNA, sistemas COMAP. Datos de telemetría: **no existen** — se autoran sintéticos y se etiquetan como demostración.

## Direction contract

THESIS: La página es un travelling de retroceso, del tablero encendido a la oficina a doscientas millas. Rechaza el hero-features-testimonio-CTA que este rubro copia del SaaS.

OWN-WORLD: Marca Tecvol heredada tal cual. Sora 600 en caja alta, naranja #FF8929 como única señal activa, oscuros #16191D y #333, gris acero #727577. Componentes en lenguaje de frente de tablero: chapa grabada, serigrafía, bisel de instrumento, borneras. Sin sombras blandas, sin vidrio, sin degradados decorativos.

STORY: El armador entiende que el tablero que Tecvol le construyó ahora le habla; cree que puede saber el estado sin subir a bordo, porque lo reporta quien lo fabricó; pide la demo.

FIRST VIEWPORT: Frente de tablero a sangre completa, instrumentos vivos corriendo datos sintéticos etiquetados. Chapa grabada abajo a la izquierda con buque y distancia a puerto. "Pedir demo" a la derecha sobre la puerta del tablero, al tamaño de un interruptor real.

FORM: La sala de máquinas remota, #1 de mi lista ordenada de siete, seed 7fbdac5d.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Momento memorable

El travelling: cuatro planos construidos de verdad (tablero → buque → flota → oficina), encadenados por una sola cámara que se aleja mientras el dato del tablero sigue vivo en cada escala.

## Decisiones abiertas

Métricas concretas, transporte de telemetría, alarmas, backend, multi-tenencia y deploy siguen sin definir (ver PRODUCT.md). El logo vectorial lo debe aportar el usuario; hasta entonces el wordmark se compone en Sora.
