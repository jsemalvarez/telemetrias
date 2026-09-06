'use client';

import type { DispositivoVivo, MagnitudViva } from '@/lib/telemetria/panel';
import { usePanelVivo } from '@/lib/telemetria/enlace';
import { cifraTexto, edadTexto } from '@/lib/telemetria/reglas';
import { Medidor, Persianas, Piloto } from './instrumentos';

/**
 * Panel de lecturas (−A6).
 *
 * Lo que están reportando los equipos de una empresa, ahora. Es la pantalla que
 * contesta la pregunta con la que alguien entra —«¿cómo está andando esto?»— y
 * por eso es el Resumen y no una ruta aparte.
 *
 * Es la gemela honesta del registrador de demostración que vive en
 * /tablero/demostracion: aquél dibuja un tablero de buque completo con datos
 * inventados, y éste dibuja solamente lo que hay. Si una empresa no declaró
 * nada, acá no hay nada, y eso se dice. Si un equipo no reportó nunca, su
 * instrumento se muestra montado y sin aguja. **Ninguna de las dos cosas se
 * rellena con un valor de relleno**, que es lo único que separa un panel de
 * monitoreo de una ilustración.
 *
 * Tres decisiones que se ven acá y conviene tener escritas:
 *
 * — **Sólo los equipos en servicio.** Un equipo dado de baja que igual reporta
 *   se guarda y se ve en el padrón, abajo, con la edad de su último reporte.
 *   Mostrarlo entre los activos sería contradecir a quien lo dio de baja.
 * — **Con aguja sólo lo que tiene escala declarada.** Los umbrales no sirven de
 *   escala: una barra vigilada entre 385 y 420 tiene que poder mostrar 380 sin
 *   tirar la aguja afuera de la esfera. Sin escala, lectura digital.
 * — **Fuera de rango se pinta, pero no se notifica.** La aguja roja dice un
 *   hecho que está en pantalla: este valor quedó afuera de lo declarado. No
 *   sale nada del sistema — por qué medio se avisa una alerta sigue sin
 *   decidirse en PRODUCT.md, y pintar una aguja no lo decide.
 */

export function Panel({
  empresa,
  cliente,
  dispositivos: iniciales,
  ahora: ahoraDelServidor,
}: {
  empresa: string;
  /** La empresa cuyo panel se mira. Viaja en cada pedido de refresco. */
  cliente: string;
  dispositivos: DispositivoVivo[];
  ahora: number;
}) {
  const { dispositivos, ahora, enlace } = usePanelVivo(iniciales, ahoraDelServidor, cliente);
  const vivo = enlace === 'vivo';

  return (
    <main className="registro" id="contenido">
      <div className="marco">
        <div className="regleta registro__panel panel">
          <div className="regleta__chapa panel__chapa">
            <span className="serigrafia">−A6 · Panel de lecturas</span>
            {/* La lámpara del enlace. Naranja encendida es señal viva, que es
                lo único para lo que este mundo usa el naranja. */}
            <Piloto encendida={vivo} etiqueta={vivo ? 'Enlace' : 'Sin enlace'} />
          </div>

          <div className="registro__cabeza">
            <div className="registro__texto">
              <h1>Lecturas</h1>
              <p>
                Lo que están reportando los equipos de {empresa}. Cada instrumento dice de
                cuándo es su número, y el que todavía no reportó se muestra sin aguja.
              </p>
            </div>
          </div>

          {/* Perder el enlace es un estado normal de este producto, no un
              error: se declara y se sigue mostrando lo último que llegó, que
              es lo que alguien a bordo necesita ver. Lo que no se hace es
              seguir presentándolo como si fuera de ahora — de eso se encarga
              la edad, que sigue corriendo abajo de cada número. */}
          {vivo ? null : (
            <div className="aviso aviso--atencion regleta__aviso" role="status">
              Sin enlace con el servidor. Lo que ves es lo último que llegó, con su edad al
              pie de cada instrumento.
            </div>
          )}

          {dispositivos.length ? (
            <div className="panel__equipos">
              {dispositivos.map((dispositivo) => (
                <Equipo key={dispositivo.id} dispositivo={dispositivo} ahora={ahora} />
              ))}
            </div>
          ) : (
            <div className="registro__lista">
              <div className="hueco vacio">
                <Persianas filas={6} />
                <p className="vacio__titulo">No hay ningún equipo en servicio.</p>
                <p className="vacio__detalle serigrafia">
                  Se declaran en el padrón de dispositivos.
                </p>
              </div>
            </div>
          )}

          <p className="registro__nota">
            El monitoreo todavía no está instalado en ningún lado: acá se ve lo que hayan
            reportado los equipos declarados, y nada más. Un instrumento sin aguja es un
            equipo que no habló, no un equipo en cero.{' '}
            <a className="fila__accion panel__demo" href="/tablero/demostracion">
              Ver el tablero de demostración
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

/* -------------------------------- Un equipo -------------------------------- */

/**
 * Un dispositivo y su juego de instrumentos.
 *
 * La chapa lleva el serial además del rótulo, y no es adorno: el serial es lo
 * que el fierro dice de sí mismo y lo que hay que poder cotejar contra la
 * chapita del equipo cuando un número no cierra.
 */
function Equipo({ dispositivo, ahora }: { dispositivo: DispositivoVivo; ahora: number }) {
  return (
    <section className="equipo">
      <div className="equipo__chapa">
        <div className="equipo__quien">
          <h2 className="equipo__rotulo">{dispositivo.rotulo}</h2>
          <span className="equipo__donde serigrafia">
            <span className="cifra">{dispositivo.serial}</span>
            {dispositivo.ubicacion ? <> · {dispositivo.ubicacion}</> : null}
          </span>
        </div>
      </div>

      {dispositivo.magnitudes.length ? (
        /* Flex y no una grilla `auto-fit`: con las columnas fijas, una última
           fila incompleta deja el filo negro asomando como superficie en vez de
           como línea. Acá los instrumentos se reparten el sobrante. */
        <div className="equipo__instrumentos">
          {dispositivo.magnitudes.map((magnitud, i) => (
            <Instrumento
              key={magnitud.id}
              magnitud={magnitud}
              designacion={`−P${9 + i}`}
              ahora={ahora}
            />
          ))}
        </div>
      ) : (
        <p className="equipo__sin-magnitudes serigrafia">
          Este equipo no tiene ninguna magnitud declarada todavía.
        </p>
      )}
    </section>
  );
}

/* ------------------------------ Un instrumento ------------------------------ */

/** ¿El valor quedó afuera de lo que alguien declaró que se vigila? */
function fueraDeRango(magnitud: MagnitudViva, valor: number): boolean {
  if (magnitud.min !== null && valor < magnitud.min) return true;
  if (magnitud.max !== null && valor > magnitud.max) return true;
  return false;
}

/**
 * Una magnitud, montada en su alojamiento.
 *
 * Con escala declarada se dibuja con aguja; sin escala, como lectura digital.
 * No es una preferencia de estilo: una aguja necesita saber de dónde a dónde
 * llega la esfera, y sacar esa escala de los datos que fueron llegando movería
 * la cara del instrumento abajo de la aguja cada vez que apareciera un extremo
 * nuevo. Un instrumento que se recalibra solo no es un instrumento.
 *
 * La cifra va abajo de la aguja y no adentro: la aguja se lee de lejos y de
 * reojo —es para eso— y el número exacto se lee cuando hace falta. Un tablero
 * de verdad tiene las dos cosas por la misma razón.
 */
function Instrumento({
  magnitud,
  designacion,
  ahora,
}: {
  magnitud: MagnitudViva;
  designacion: string;
  ahora: number;
}) {
  const { ultima, escalaMin, escalaMax } = magnitud;
  const conEscala = escalaMin !== null && escalaMax !== null;
  const alarma = ultima !== null && fueraDeRango(magnitud, ultima.valor);

  return (
    <div className={`hueco equipo__instrumento${conEscala ? ' hueco--aguja' : ''}`}>
      <span className="serigrafia hueco__designacion" aria-hidden="true">
        {designacion}
      </span>

      {conEscala ? (
        <Medidor
          valor={ultima?.valor ?? escalaMin}
          min={escalaMin}
          max={escalaMax}
          etiqueta={magnitud.rotulo}
          unidad={magnitud.unidad ?? ''}
          atencion={alarma}
          sinSenal={ultima === null}
        />
      ) : (
        <span className="serigrafia equipo__etiqueta">{magnitud.rotulo}</span>
      )}

      <span className={`equipo__valor cifra${alarma ? ' equipo__valor--alarma' : ''}`}>
        {ultima ? cifraTexto(ultima.valor) : '—'}
        {ultima && magnitud.unidad ? (
          <span className="lectura__unidad">{magnitud.unidad}</span>
        ) : null}
      </span>

      <span className="serigrafia equipo__cuando">
        {ultima ? edadTexto(ahora - Date.parse(ultima.medidoEn)) : 'Sin reportes'}
      </span>
    </div>
  );
}
