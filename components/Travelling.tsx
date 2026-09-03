'use client';

import { useEffect, useRef } from 'react';
import { Tablero } from './Tablero';
import { Buque, TIPOS } from './Buque';
import { Interruptor } from './instrumentos';
import { FLOTA_DEMO, ETIQUETA_DEMO } from '@/lib/datos';
import { useVivo, detalleDe, tensionViva } from '@/lib/vivo';

/**
 * El único momento de movimiento de la página: una cámara que se aleja.
 * Cuatro planos — tablero, buque, flota, oficina — encadenados por scroll.
 *
 * El dato es el mismo en los cuatro. Esa es la tesis: la lectura que corre en
 * el instrumento del plano 1 se sigue leyendo dentro del casco, en la flota y
 * en la pantalla de la oficina. El texto de cada plano vive en el flujo normal
 * del documento, así que la página se lee entera sin JavaScript y sin
 * movimiento.
 */
export function Travelling() {
  const seccion = useRef<HTMLElement>(null);
  const visor = useRef<HTMLDivElement>(null);
  const { valores } = useVivo();

  useEffect(() => {
    const el = seccion.current;
    const v = visor.current;
    if (!el || !v) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let pedido = 0;
    const medir = () => {
      pedido = 0;
      const caja = el.getBoundingClientRect();
      const recorrido = caja.height - window.innerHeight;
      const p = recorrido <= 0 ? 0 : Math.min(1, Math.max(0, -caja.top / recorrido));

      /* Escala de cámara: cada plano se aleja un paso. Exponencial de salida. */
      const z = Math.pow(1 - p, 2.6) * 0.86 + 0.14;
      v.style.setProperty('--p', p.toFixed(4));
      v.style.setProperty('--z', z.toFixed(4));

      const ventana = (centro: number, ancho = 0.2) =>
        Math.max(0, 1 - Math.abs(p - centro) / ancho).toFixed(3);
      v.style.setProperty('--o1', ventana(0.0, 0.26));
      v.style.setProperty('--o2', ventana(0.35));
      v.style.setProperty('--o3', ventana(0.67));
      v.style.setProperty('--o4', ventana(1.0, 0.26));
    };

    const alScroll = () => {
      if (pedido) return;
      pedido = requestAnimationFrame(medir);
    };

    medir();
    window.addEventListener('scroll', alScroll, { passive: true });
    window.addEventListener('resize', alScroll, { passive: true });
    return () => {
      if (pedido) cancelAnimationFrame(pedido);
      window.removeEventListener('scroll', alScroll);
      window.removeEventListener('resize', alScroll);
    };
  }, []);

  return (
    <section className="travelling" ref={seccion} aria-labelledby="t-titulo">
      <div className="travelling__visor" ref={visor}>
        <div className="camara">
          {/* Plano 4 — la oficina: la misma flota, ya a escala de escritorio. */}
          <div className="plano plano--oficina">
            <div className="monitor">
              <div className="monitor__barra">
                <span className="serigrafia">Monitoreo Tecvol</span>
                <span className="serigrafia cifra">Mar del Plata · 04:12</span>
              </div>
              <div className="monitor__base">
                <ul className="mini-flota" aria-hidden="true">
                  {FLOTA_DEMO.map((b) => (
                    <li key={b.buque} className={`mini-flota__fila mini-flota__fila--${b.estado}`}>
                      <span className="mini-flota__piloto" />
                      <span className="mini-flota__nombre">BP &ldquo;{b.buque}&rdquo;</span>
                      <span className="mini-flota__detalle cifra">
                        {detalleDe(b.buque, b.estado, b.detalle, valores)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Plano 3 — la flota: siete cascos, siete perfiles, el mismo dato. */}
          <div className="plano plano--flota">
            <div className="flota-mar">
              {/* Siete buques reales llevando lecturas escritas: el campo entero
                  se rotula, no sólo los planos vecinos. */}
              <p className="serigrafia flota-mar__demo">{ETIQUETA_DEMO}</p>
              {FLOTA_DEMO.map((b) => {
                const lectura =
                  b.estado === 'sin-enlace'
                    ? null
                    : b.estado === 'alarma'
                      ? `${valores[6].toFixed(0)} °C`
                      : tensionViva(valores);
                return (
                  <div key={b.buque} className={`flota-mar__casco flota-mar__casco--${b.estado}`}>
                    <Buque
                      nombre={b.buque}
                      encendido={b.estado !== 'sin-enlace'}
                      alarma={b.estado === 'alarma'}
                      lectura={lectura ?? undefined}
                    />
                    <span className="flota-mar__pie">
                      <span className="serigrafia flota-mar__nombre">{b.buque}</span>
                      <span className="serigrafia flota-mar__tipo">{TIPOS[b.buque]}</span>
                    </span>
                    {/* En el ancho del teléfono la cifra dentro del casco es una
                        mancha: ahí el dato se lee acá, en texto de la página. */}
                    <span className="cifra flota-mar__valor">{lectura ?? 'Sin enlace'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Plano 2 — el buque: el tablero sigue leyéndose adentro del casco. */}
          <div className="plano plano--buque">
            <div className="buque-solo">
              <Buque
                nombre="Luigi"
                encendido
                lectura={tensionViva(valores)}
                titulo="Perfil del BP Luigi con la sala de máquinas señalizada"
              />
            </div>
          </div>

          {/* Plano 1 — el tablero */}
          <div className="plano plano--tablero">
            <Tablero />
          </div>
        </div>
      </div>

      {/* El relato va en el flujo: legible sin JS, sin movimiento y con lector de pantalla. */}
      <div className="travelling__relato">
        <article className="relato" id="contenido">
          <div className="relato__chapa relato__chapa--lead">
            <h1 id="t-titulo">Que el equipo avise antes de fallar.</h1>
            <p>
              Monitoreo remoto para equipamiento eléctrico e industrial. Se instala sobre lo que
              ya tenés: un microcontrolador lee tensión, corriente, temperatura y estado, los
              reporta desde donde esté el equipo, y avisa cuando algo se sale de rango.
            </p>
            <Interruptor href="#demo" designacion="−S1">
              Pedir demo
            </Interruptor>
          </div>
        </article>

        <article className="relato relato--der">
          <div className="relato__chapa">
            <h2>Si tiene algo que medir, se instrumenta.</h2>
            <p>
              Un tablero principal, un generador, una cámara de frío. El microcontrolador se monta
              sobre la instalación que ya está trabajando y empieza a reportar. Tecvol calcula,
              fabrica y monta instalaciones eléctricas desde 2020, y ese oficio es el que sabe
              dónde se toma cada lectura — pero el equipo no tiene que ser nuestro para que hable.
            </p>
          </div>
        </article>

        <article className="relato">
          <div className="relato__chapa">
            <h2>Y después está el resto de la flota.</h2>
            <p>
              Siete cascos, una sola pantalla. El que tiene la temperatura alta se ve antes de que
              alguien llame por radio, y el que quedó fuera de cobertura se ve como lo que es: sin
              enlace, que no es lo mismo que sin problema.
            </p>
          </div>
        </article>

        <article className="relato relato--der">
          <div className="relato__chapa">
            <h2>A doscientas millas de la sala de máquinas.</h2>
            <p>
              Cuatro de la mañana en Mar del Plata. El buque está trabajando y vos no estás a
              bordo. Eso es lo único que este producto resuelve, y alcanza.
            </p>
            <p className="serigrafia relato__demo">{ETIQUETA_DEMO}</p>
          </div>
        </article>
      </div>
    </section>
  );
}
