/**
 * Capturas de la ruta /tablero — el registrador de faja.
 *
 * La pluma tarda 0,85 s en llegar al valor nuevo, así que toda captura espera a
 * que se asiente: un instrumento fotografiado a mitad de recorrido se revisa
 * como si estuviera mal puesto.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = 'C:/.JSM/claude/design/impeccable';
const SALIDA = path.join(RAIZ, '.impeccable', 'review');
const URL = 'http://localhost:3000/tablero';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

fs.mkdirSync(SALIDA, { recursive: true });
const navegador = await chromium.launch({ executablePath: CHROME, headless: true });

async function capturar(nombre, ancho, alto, opciones = {}) {
  const { sesion = true, buque = null, regla = null, completa = true } = opciones;
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1 });
  const pag = await ctx.newPage();
  await pag.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });
  await pag.evaluate(() => document.fonts.ready);

  if (sesion) {
    await pag.evaluate(() => sessionStorage.setItem('tecvol:demo', 'jefe.maquinas'));
    await pag.reload({ waitUntil: 'networkidle' });
    await pag.evaluate(() => document.fonts.ready);
  }

  if (buque) {
    await pag.click(`.pluma:has-text("${buque}")`);
  }

  /* La pluma tiene 0,85 s de carrera; el intervalo vivo corre cada 0,9 s. */
  await pag.waitForTimeout(1600);

  if (regla !== null) {
    /* La regla se arrastra: agarrar el papel, mover y soltar. Un hover no la
       mueve, que es justamente lo que se está verificando. */
    const caja = await pag.locator('.canal__papel').first().boundingBox();
    const y = caja.y + caja.height / 2;
    await pag.mouse.move(caja.x + caja.width * 0.9, y);
    await pag.mouse.down();
    await pag.mouse.move(caja.x + caja.width * regla, y, { steps: 14 });
    await pag.mouse.up();
    await pag.waitForTimeout(500);
  }

  const destino = path.join(SALIDA, nombre);
  await pag.screenshot({ path: destino, fullPage: completa && regla === null });
  const kb = Math.round(fs.statSync(destino).size / 1024);
  const alto_doc = await pag.evaluate(() => document.documentElement.scrollHeight);
  console.log(`${nombre}  ${ancho}x${alto}  ${kb} KB  (doc ${alto_doc}px)`);
  await ctx.close();
}

await capturar('registrador-desktop.png', 1440, 900);
await capturar('registrador-mobile.png', 390, 844);
await capturar('registrador-1280.png', 1280, 900);
await capturar('registrador-sin-enlace.png', 1440, 900, { buque: 'Luca Mario' });
await capturar('registrador-puerto.png', 1440, 900, { buque: 'Don Francisco' });
await capturar('registrador-regla.png', 1440, 900, { regla: 0.42 });
await capturar('registrador-mobile-sin-enlace.png', 390, 844, { buque: 'Luca Mario' });
await capturar('tablero-desktop.png', 1440, 900, { sesion: false });
await capturar('tablero-mobile.png', 390, 844, { sesion: false });

await navegador.close();
console.log('capturas del registrador listas en .impeccable/review/');
