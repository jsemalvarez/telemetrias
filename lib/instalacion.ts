'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Estado de instalación de la PWA.
 *
 * Hay dos caminos incompatibles. Chrome (Android y escritorio) dispara
 * `beforeinstallprompt` y deja abrir el diálogo nativo de instalación desde un
 * gesto del usuario; hay que retener el evento porque después de ese tick no se
 * puede volver a pedir. Safari en iOS no dispara nada y no expone API: lo único
 * posible es explicar el camino de Compartir → Agregar a pantalla de inicio.
 */

/** `beforeinstallprompt` no está en lib.dom: es propuesta, no estándar. */
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const CLAVE_DESCARTE = 'tecvol:instalacion-descartada-hasta';
const ESPERA_TRAS_DESCARTE = 7 * 24 * 60 * 60 * 1000;
/** El convite no aparece encima de la primera impresión: la deja pasar. */
const DEMORA = 3000;

function descartadaAhora() {
  try {
    const hasta = localStorage.getItem(CLAVE_DESCARTE);
    return Boolean(hasta) && Date.now() < Number(hasta);
  } catch {
    /* Almacenamiento bloqueado: mostramos el convite, es lo menos malo. */
    return false;
  }
}

function anotarDescarte() {
  try {
    localStorage.setItem(CLAVE_DESCARTE, String(Date.now() + ESPERA_TRAS_DESCARTE));
  } catch {
    /* Sin almacenamiento no hay memoria del descarte; el convite reaparece. */
  }
}

export function useInstalacion() {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null);
  const [yaInstalada, setYaInstalada] = useState(false);
  const [esIOS, setEsIOS] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    /* Corriendo ya como app instalada no hay nada que ofrecer. */
    const comoApp =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true);

    if (comoApp) {
      setYaInstalada(true);
      return;
    }

    if (descartadaAhora()) return;

    /* Safari en iOS es el único que necesita instrucciones a mano. Chrome y
       Firefox sobre iOS comparten el motor pero no instalan, así que quedan
       afuera: mostrarles el paso a paso sería mentirles. */
    const enIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as { MSStream?: unknown }).MSStream;
    const enSafari =
      /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);

    if (enIOS && enSafari) {
      setEsIOS(true);
      const reloj = setTimeout(() => setMostrar(true), DEMORA);
      return () => clearTimeout(reloj);
    }

    let reloj: ReturnType<typeof setTimeout>;

    const alPoderInstalar = (ev: Event) => {
      /* Sin `preventDefault` Chrome muestra además su propia barrita. */
      ev.preventDefault();
      if (descartadaAhora()) return;

      setEvento(ev as EventoInstalacion);
      clearTimeout(reloj);
      reloj = setTimeout(() => setMostrar(true), DEMORA);
    };

    const alInstalar = () => {
      setYaInstalada(true);
      setMostrar(false);
      setEvento(null);
    };

    window.addEventListener('beforeinstallprompt', alPoderInstalar);
    window.addEventListener('appinstalled', alInstalar);

    return () => {
      clearTimeout(reloj);
      window.removeEventListener('beforeinstallprompt', alPoderInstalar);
      window.removeEventListener('appinstalled', alInstalar);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!evento) return;

    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === 'dismissed') anotarDescarte();

    /* El evento es de un solo uso: retenerlo después de `prompt` no sirve. */
    setEvento(null);
    setMostrar(false);
  }, [evento]);

  const descartar = useCallback(() => {
    setMostrar(false);
    anotarDescarte();
  }, []);

  return {
    /** Chrome ya avisó que la app es instalable y el diálogo nativo está listo. */
    sePuedeInstalar: evento !== null,
    /** Safari en iOS: no hay API, sólo instrucciones. */
    esIOS,
    yaInstalada,
    mostrar,
    instalar,
    descartar,
  };
}
