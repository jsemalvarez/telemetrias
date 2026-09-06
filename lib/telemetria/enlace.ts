'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { DispositivoVivo } from './panel';

/**
 * El enlace del panel con el servidor.
 *
 * Trae el estado del panel y dice si lo que está en pantalla es de ahora. Es
 * una sola pieza y no dos porque son la misma pregunta: qué se está midiendo, y
 * si esto es de ahora o es lo último que alcancé a saber.
 *
 * ── Dos caminos, y uno sostiene al otro ────────────────────────────────────
 *
 * **Empuje**: Supabase Realtime avisa por el canal de la empresa apenas la
 * ingesta guarda algo, y el panel se vuelve a pedir en ese instante. El socket
 * lo sostiene Supabase y no esta aplicación, que es lo que lo hace funcionar
 * igual en una notebook que en Vercel — en serverless no hay proceso largo que
 * pueda sostener una conexión abierta.
 *
 * **Sondeo**: preguntar cada tanto. No es el plan B que se tira cuando anda el
 * plan A: es el piso. Un canal que se cortó **no sabe qué se perdió mientras
 * estuvo caído**, y en este producto quedarse sin señal no es un caso de borde.
 * Con el canal vivo el sondeo baja a resincronización y deja de costar; sin
 * canal, sube y sostiene la pantalla solo.
 *
 * Que los dos vivan acá adentro y no en la pantalla es lo que hace que
 * `Panel.tsx` no sepa cuál está andando. El día que Broadcast se cambie por
 * otra cosa, se cambia acá.
 *
 * ── Qué manda el canal ─────────────────────────────────────────────────────
 *
 * El mensaje **no trae la medición**: trae el serial del equipo que habló, y
 * este hook vuelve a pedir el panel entero. Un mensaje con el valor adentro
 * tendría que traer también la magnitud, su unidad, sus umbrales y su escala
 * para poder dibujarse — un segundo formato que mantener en sincronía con
 * `panelDe`— y además dejaría la pantalla dependiendo de no haberse perdido
 * ningún mensaje. Así, el canal sólo dice «mirá de nuevo».
 */

/** Cada cuánto se pregunta cuando algo se está moviendo y no hay canal. */
export const CADENCIA_MS = 1000;

/**
 * Y cada cuánto cuando hace rato que no cambia nada.
 *
 * **La cadencia la pide el dato, no el reloj.** Un pedido por segundo sostenido
 * son unas 3.600 invocaciones por hora y por pantalla abierta, y en serverless
 * eso se paga para traer casi siempre lo mismo que ya estaba. El sondeo afloja
 * solo cuando la respuesta viene igual —1 s, 2 s, 4 s y de ahí el tope— y
 * vuelve a un segundo en cuanto algo se mueve. Cinco y no treinta porque ese
 * tope es lo peor que puede tardar en verse el primer cambio después de una
 * pausa, y quien gira una perilla no puede quedarse medio minuto mirando una
 * aguja quieta.
 */
export const CADENCIA_REPOSO_MS = 5000;

/**
 * Y cada cuánto con el canal vivo.
 *
 * Acá el sondeo ya no es quien trae las novedades: es la red que atrapa lo que
 * el canal haya perdido mientras estuvo caído, o lo que se haya perdido entre
 * que se cortó y este hook se dio cuenta. Medio minuto alcanza y sale
 * prácticamente gratis.
 */
export const CADENCIA_RESINCRONIZACION_MS = 30_000;

/** Cada cuánto se reescribe la edad de un dato. Nunca cambia más rápido. */
const RELOJ_MS = 5000;

/** Cuántos intentos fallidos seguidos hacen falta para declarar que no hay enlace. */
const TOLERANCIA = 3;

/** Hasta cuánto se afloja entre reintentos. Un buque sin señal no se martilla. */
const ESPERA_MAXIMA_MS = 30_000;

/** Con cuánta anticipación se renueva el pase del canal antes de que venza. */
const MARGEN_RENOVACION_MS = 5 * 60_000;

export type Enlace = 'vivo' | 'sin-enlace';

/** Por dónde está llegando el dato ahora mismo. */
export type Modo = 'empuje' | 'sondeo';

export type PanelVivo = {
  dispositivos: DispositivoVivo[];
  /** El instante contra el que se mide la edad, corregido por el reloj del servidor. */
  ahora: number;
  enlace: Enlace;
  modo: Modo;
};

type Pase = {
  url: string;
  clavePublica: string;
  topico: string;
  token: string;
  venceEn: number;
};

/**
 * Una huella de lo que la pantalla dibuja, para saber si cambió algo.
 *
 * Es el objeto entero y no sólo las marcas de tiempo: si alguien declara un
 * equipo, retoca un umbral o corrige una escala mientras el panel está abierto,
 * eso también es un cambio que hay que ver. Serializar unos pocos kilobytes
 * cuesta microsegundos y ahorra un render por segundo.
 */
const huellaDe = (dispositivos: DispositivoVivo[]) => JSON.stringify(dispositivos);

export function usePanelVivo(
  inicial: DispositivoVivo[],
  ahoraDelServidor: number,
  cliente: string,
): PanelVivo {
  const [dispositivos, setDispositivos] = useState(inicial);
  const [enlace, setEnlace] = useState<Enlace>('vivo');
  const [modo, setModo] = useState<Modo>('sondeo');

  /* La distancia entre el reloj del servidor y el de esta máquina. La edad de
     una lectura se mide contra el primero: una tablet a bordo con la hora
     corrida mostraría, si no, lecturas de ayer o del futuro. */
  const desfase = useRef(ahoraDelServidor - Date.now());
  const [ahora, setAhora] = useState(ahoraDelServidor);

  const huella = useRef<string | null>(null);
  /* Cuántas respuestas seguidas vinieron iguales, y si el canal está en pie.
     Van en refs porque los lee el bucle del sondeo, que vive fuera del render. */
  const quietas = useRef(0);
  const empuje = useRef(false);
  const despertar = useRef<(() => void) | null>(null);

  /* El reloj de la edad, aparte del enlace: tiene que seguir corriendo aunque
     no llegue ni una respuesta. Una pantalla sin señal que congela el «hace 2
     min» está diciendo que el dato es de hace dos minutos cuando ya es de hace
     una hora, y eso es exactamente lo que este producto promete no hacer. */
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now() + desfase.current), RELOJ_MS);
    return () => clearInterval(reloj);
  }, []);

  /**
   * Pide el panel entero y lo pone en pantalla si cambió. Devuelve si el pedido
   * llegó a destino, que es otra cosa que si trajo novedades.
   */
  const refrescar = useCallback(async (): Promise<boolean> => {
    const respuesta = await fetch(`/api/lecturas?cliente=${encodeURIComponent(cliente)}`, {
      cache: 'no-store',
    });
    if (!respuesta.ok) throw new Error(String(respuesta.status));
    const cuerpo = await respuesta.json();

    desfase.current = cuerpo.ahora - Date.now();

    const ahoraHuella = huellaDe(cuerpo.dispositivos);
    if (ahoraHuella === huella.current) return false;

    huella.current = ahoraHuella;
    setDispositivos(cuerpo.dispositivos);
    setAhora(cuerpo.ahora);
    return true;
  }, [cliente]);

  /* ------------------------------- El sondeo ------------------------------- */

  useEffect(() => {
    let montado = true;
    let turno: ReturnType<typeof setTimeout> | undefined;
    let fallos = 0;

    const programar = (espera: number) => {
      if (montado) turno = setTimeout(tic, espera);
    };

    /** Cuánto esperar hasta el próximo pedido, según qué está pasando. */
    const proximaEspera = () => {
      if (empuje.current) return CADENCIA_RESINCRONIZACION_MS;
      if (quietas.current === 0) return CADENCIA_MS;
      return Math.min(CADENCIA_MS * 2 ** quietas.current, CADENCIA_REPOSO_MS);
    };

    async function tic() {
      if (!montado) return;

      /* Una pestaña de fondo no mira nada. Se sigue despertando para no quedar
         dormida cuando vuelva al frente, pero no pide. */
      if (typeof document !== 'undefined' && document.hidden) {
        programar(CADENCIA_MS);
        return;
      }

      try {
        const cambio = await refrescar();
        if (!montado) return;
        setEnlace('vivo');
        fallos = 0;
        quietas.current = cambio ? 0 : quietas.current + 1;
        programar(proximaEspera());
      } catch {
        if (!montado) return;
        fallos += 1;
        /* No se declara la pérdida al primer tropiezo: un pedido que se cae es
           lo normal en un muelle. Se declara cuando ya no es un tropiezo. */
        if (fallos >= TOLERANCIA) setEnlace('sin-enlace');
        /* Y se afloja, en vez de martillar una conexión que no está. */
        programar(Math.min(CADENCIA_MS * 2 ** fallos, ESPERA_MAXIMA_MS));
      }
    }

    /* Lo que usa el canal para pedir un refresco ya: corta la espera en curso y
       vuelve a pedir. Así el empuje y el sondeo no compiten — hay un solo lugar
       que pide, y el canal apura el turno. */
    despertar.current = () => {
      if (!montado) return;
      clearTimeout(turno);
      fallos = 0;
      quietas.current = 0;
      void tic();
    };

    /* Volver a la pestaña pide de nuevo enseguida: nadie espera un segundo
       mirando un número que sabe viejo. */
    const alVolver = () => {
      if (typeof document !== 'undefined' && !document.hidden) despertar.current?.();
    };
    document.addEventListener('visibilitychange', alVolver);

    programar(proximaEspera());

    return () => {
      montado = false;
      despertar.current = null;
      clearTimeout(turno);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [refrescar]);

  /* -------------------------------- El canal -------------------------------- */

  useEffect(() => {
    let montado = true;
    let cliente_: SupabaseClient | null = null;
    let canal: RealtimeChannel | null = null;
    let renovacion: ReturnType<typeof setTimeout> | undefined;

    const caer = () => {
      empuje.current = false;
      if (montado) setModo('sondeo');
    };

    async function pedirPase(): Promise<Pase | null> {
      const respuesta = await fetch(`/api/canal?cliente=${encodeURIComponent(cliente)}`, {
        cache: 'no-store',
      });
      if (!respuesta.ok) return null;
      return (await respuesta.json()).canal as Pase;
    }

    async function conectar() {
      let pase: Pase | null;
      try {
        pase = await pedirPase();
      } catch {
        pase = null;
      }

      /* Sin pase no hay canal, y no es un error: es una instalación sin
         Supabase configurado. El sondeo ya está sosteniendo la pantalla. */
      if (!pase || !montado) return;

      cliente_ = createClient(pase.url, pase.clavePublica, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await cliente_.realtime.setAuth(pase.token);

      canal = cliente_
        .channel(pase.topico, { config: { private: true } })
        .on('broadcast', { event: 'lecturas' }, () => despertar.current?.())
        .subscribe((estado) => {
          if (!montado) return;
          if (estado === 'SUBSCRIBED') {
            empuje.current = true;
            setModo('empuje');
            /* Entre que se pidió el panel y que el canal quedó en pie pudo
               entrar algo. Se pide una vez más y recién ahí se está al día. */
            despertar.current?.();
            return;
          }
          /* CHANNEL_ERROR, TIMED_OUT o CLOSED: el sondeo vuelve a mandar. */
          caer();
        });

      /* El pase vale una hora. Se renueva antes de que venza, para que una
         pantalla abierta toda la tarde no se quede muda sin avisar. */
      renovacion = setTimeout(
        () => {
          void renovar();
        },
        Math.max(pase.venceEn - Date.now() - MARGEN_RENOVACION_MS, 60_000),
      );
    }

    async function renovar() {
      if (!montado || !cliente_) return;
      try {
        const pase = await pedirPase();
        if (!pase || !montado) return;
        await cliente_.realtime.setAuth(pase.token);
        renovacion = setTimeout(
          () => {
            void renovar();
          },
          Math.max(pase.venceEn - Date.now() - MARGEN_RENOVACION_MS, 60_000),
        );
      } catch {
        /* Si no se pudo renovar, el canal va a caerse solo cuando el token
           venza, y el sondeo lo va a cubrir. No hay nada que romper acá. */
      }
    }

    void conectar();

    return () => {
      montado = false;
      caer();
      clearTimeout(renovacion);
      if (canal) void cliente_?.removeChannel(canal);
      void cliente_?.realtime.disconnect();
    };
  }, [cliente]);

  return { dispositivos, ahora, enlace, modo };
}
