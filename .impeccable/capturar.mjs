import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = 'C:/.JSM/claude/design/impeccable';
const SALIDA = path.join(RAIZ, '.impeccable', 'review');
const URL = 'http://localhost:3000';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

fs.mkdirSync(SALIDA, { recursive: true });

const navegador = await chromium.launch({ executablePath: CHROME, headless: true });

async function capturar(nombre, ancho, alto, opciones = {}) {
  const { completa = false, scroll = null, ruta = '/' } = opciones;
  const ctx = await navegador.newContext({
    viewport: { width: ancho, height: alto },
    deviceScaleFactor: 1,
  });
  const pag = await ctx.newPage();
  await pag.goto(URL + ruta, { waitUntil: 'networkidle', timeout: 45000 });
  // Las fuentes tienen que estar cargadas o la métrica de texto miente.
  await pag.evaluate(() => document.fonts.ready);

  if (opciones.credenciales) {
    /* `fill` y `click` esperan a que el control sea accionable, así que no
       corren antes de que React hidrate. Escribir al DOM a mano acá deja el
       campo vacío y dispara la validación equivocada. */
    await pag.fill('#usuario', opciones.credenciales.usuario);
    await pag.fill('#clave', opciones.credenciales.clave);
    await pag.click('.regleta button[type="submit"]');
    await pag.waitForTimeout(1400);
  }

  if (opciones.sesion) {
    await pag.evaluate(() => sessionStorage.setItem('tecvol:demo', 'demo'));
    await pag.reload({ waitUntil: 'networkidle' });
  }

  if (scroll !== null) {
    if (typeof scroll === 'number') {
      await pag.evaluate((y) => window.scrollTo(0, y), scroll);
    } else if (scroll.sel) {
      await pag.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
      }, scroll.sel);
    } else {
      /* Progreso real del travelling: el mismo cálculo que hace el componente,
         para que la captura caiga exactamente donde cae el plano. */
      await pag.evaluate((frac) => {
        const sec = document.querySelector('.travelling');
        if (!sec) return;
        const arriba = sec.getBoundingClientRect().top + window.scrollY;
        const recorrido = sec.offsetHeight - window.innerHeight;
        window.scrollTo(0, Math.round(arriba + recorrido * frac));
      }, scroll.p);
    }
    await pag.waitForTimeout(800);
  }
  await pag.waitForTimeout(900);

  const destino = path.join(SALIDA, nombre);
  await pag.screenshot({ path: destino, fullPage: completa });
  const kb = Math.round(fs.statSync(destino).size / 1024);
  const alturaDoc = await pag.evaluate(() => document.documentElement.scrollHeight);
  console.log(`${nombre}  ${ancho}x${alto}  ${completa ? 'completa' : 'viewport'}  ${kb} KB  (doc ${alturaDoc}px)`);
  await ctx.close();
}

const vh = 900;
// Página completa en las dos clases de dispositivo.
await capturar('desktop.png', 1440, vh, { completa: true });
await capturar('mobile.png', 390, 844, { completa: true });

// El travelling es scroll-driven: una captura completa no puede mostrarlo.
// Un plano por posición, para que la revisión pueda juzgar la interacción firma.
await capturar('desktop-plano1.png', 1440, vh, { scroll: { p: 0.02 } });
await capturar('desktop-plano2.png', 1440, vh, { scroll: { p: 0.34 } });
await capturar('desktop-plano3.png', 1440, vh, { scroll: { p: 0.66 } });
await capturar('desktop-plano4.png', 1440, vh, { scroll: { p: 0.98 } });
await capturar('mobile-plano1.png', 390, 844, { scroll: { p: 0.02 } });
await capturar('mobile-plano3.png', 390, 844, { scroll: { p: 0.66 } });

// Secciones por debajo del travelling, a tamaño de viewport para poder leerlas.
await capturar('desktop-flota.png', 1440, vh, { scroll: { sel: '#flota' } });
await capturar('desktop-alcance.png', 1440, vh, { scroll: { sel: '#alcance' } });
await capturar('desktop-obras.png', 1440, vh, { scroll: { sel: '#obras' } });
await capturar('desktop-demo.png', 1440, vh, { scroll: { sel: '#demo' } });
await capturar('mobile-demo.png', 390, 844, { scroll: { sel: '#demo' } });

// Acceso y su destino provisorio.
await capturar('login-desktop.png', 1440, vh, { ruta: '/login', completa: true });
await capturar('login-mobile.png', 390, 844, { ruta: '/login', completa: true });
await capturar('tablero-desktop.png', 1440, vh, { ruta: '/tablero', completa: true });
await capturar('tablero-mobile.png', 390, 844, { ruta: '/tablero', completa: true });
await capturar('tablero-sesion-desktop.png', 1440, vh, { ruta: '/tablero', completa: true, sesion: true });
await capturar('tablero-sesion-mobile.png', 390, 844, { ruta: '/tablero', completa: true, sesion: true });

// Estado de error del acceso: la mitad del trabajo de esta pantalla.
await capturar('login-error-desktop.png', 1440, vh, { ruta: '/login', completa: true, credenciales: { usuario: 'demo', clave: 'equivocada' } });
await capturar('login-error-mobile.png', 390, 844, { ruta: '/login', completa: true, credenciales: { usuario: 'demo', clave: 'equivocada' } });

await navegador.close();
console.log('capturas listas en .impeccable/review/');
