'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LECTURAS, type Lectura } from './datos';

/**
 * Una sola fuente de lecturas vivas para toda la página.
 *
 * La tesis de esta superficie es que el dato del tablero sigue vivo mientras la
 * cámara se aleja: el mismo valor que corre en el instrumento del plano 1 tiene
 * que ser el que se lee dentro del casco, en la flota y en la pantalla de la
 * oficina. Si cada plano tuviera su propio estado serían cuatro ilustraciones
 * distintas, no una cámara.
 */

type Vivo = { valores: number[]; por: (id: string) => { lectura: Lectura; valor: number } };

const Ctx = createContext<Vivo | null>(null);

export function ProveedorVivo({ children }: { children: React.ReactNode }) {
  const [valores, setValores] = useState(() => LECTURAS.map((l) => l.valor));

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setValores((prev) =>
        prev.map((v, i) => {
          const l = LECTURAS[i];
          if (l.deriva === 0) return v;
          const objetivo = l.valor + (Math.random() - 0.5) * l.deriva * 2;
          return v + (objetivo - v) * 0.35;
        }),
      );
    }, 900);
    return () => window.clearInterval(id);
  }, []);

  const valor = useMemo<Vivo>(
    () => ({
      valores,
      por: (id: string) => {
        const i = LECTURAS.findIndex((l) => l.id === id);
        return { lectura: LECTURAS[i], valor: valores[i] };
      },
    }),
    [valores],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useVivo() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useVivo necesita estar dentro de ProveedorVivo');
  return v;
}

/** Formatea una lectura para mostrarla junto a su unidad. */
export function texto(id: string, valores: number[]) {
  const i = LECTURAS.findIndex((l) => l.id === id);
  const l = LECTURAS[i];
  return `${valores[i].toFixed(l.decimales)}${l.unidad ? ' ' + l.unidad : ''}`;
}

const I_TENSION = LECTURAS.findIndex((l) => l.id === 'u12');
const I_TEMP = LECTURAS.findIndex((l) => l.id === 'tb');

/**
 * La línea de estado de cada buque, derivada del mismo dato que corre en el
 * instrumento. Un buque sin enlace conserva su texto fijo: justamente lo que
 * no puede pasar es que una lectura vieja se muestre como si fuera de ahora.
 */
export function detalleDe(buque: string, estado: string, base: string, valores: number[]) {
  if (estado === 'alarma') return `Temp. bobinado G1 · ${valores[I_TEMP].toFixed(0)} °C`;
  if (estado === 'navegando') {
    const desvio = buque === 'Anita' ? 0 : buque === 'Maria Eugenia' ? -2 : -4;
    const gen = buque === 'Maria Eugenia' ? 'G2' : 'G1';
    return `${gen} en barra · ${(valores[I_TENSION] + desvio).toFixed(0)} V`;
  }
  return base;
}

/** Tensión de barra viva, para mostrar dentro del casco en el plano 2. */
export function tensionViva(valores: number[]) {
  return `${valores[I_TENSION].toFixed(0)} V`;
}
