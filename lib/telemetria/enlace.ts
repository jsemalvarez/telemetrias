'use client';

import { useEffect, useRef, useState } from 'react';
import type { DispositivoVivo } from './panel';

/**
 * El enlace del panel con el servidor.
 *
 * Trae el estado del panel una y otra vez y dice si el enlace está en pie. Es
 * una sola pieza y no dos porque son la misma pregunta: qué se está midiendo, y
 * si lo que tengo delante es de ahora o es lo último que alcancé a saber.
 *
 * **Consulta periódica, y con esta arquitectura es la decisión correcta hoy.**
 * La aplicación va a Vercel, que es serverless: un SSE le dejaría una instancia
 * de función tomada a cada persona con la pantalla abierta, con tope de
 * duración, así que se cortaría solo. Lo que corresponde después es empuje por
 * Supabase Broadcast —el socket lo sostiene Supabase y no esta app—, y cuando
 * eso exista **esta pieza no se tira**: baja su cadencia y queda como lo que ya
 * es, la resincronización. Un canal que se cortó no sabe qué se perdió mientras
 * estuvo caído; una foto completa no necesita saberlo. En un producto donde
 * quedarse sin señal es un estado normal, ese piso no es opcional.
 *
 * Por eso lo que la pantalla consume es este hook y no un `EventSource` ni un
 * canal: el día que entre el empuje, cambia acá adentro y la pantalla no se
 * entera.
 */

/**
 * Cada cuánto se vuelve a pedir el panel **cuando algo se está moviendo**.
 *
 * Un segundo es el número que hace que una perilla girando se vea girar. Si en
 * la demo la aguja se siente atrasada, éste es el número que se toca, junto con
 * la transición de la aguja en `.medidor__aguja`.
 */
export const CADENCIA_MS = 1000;

/**
 * Y cada cuánto cuando hace rato que no cambia nada.
 *
 * **La cadencia la pide el dato, no el reloj.** Un pedido por segundo sostenido
 * son unas 3.600 invocaciones por hora y por pantalla abierta, y en serverless
 * eso se paga —además de dos consultas a la base cada vez— para traer, casi
 * siempre, exactamente lo mismo que ya estaba en pantalla. Un tablero de buque
 * no cambia sesenta veces por minuto: reporta cada tanto, y entre reporte y
 * reporte no hay nada que pedir.
 *
 * Así que el sondeo afloja solo cuando la respuesta viene igual, y vuelve a un
 * segundo en cuanto algo se mueve. La escalera es 1 s, 2 s, 4 s y de ahí el
 * tope: llega al reposo después de unos siete segundos sin novedades, y ese
 * tope es lo peor que puede tardar en verse el primer cambio después de una
 * pausa. Cinco segundos y no treinta por eso mismo — quien gira una perilla no
 * puede quedarse medio minuto mirando una aguja quieta.
 */
export const CADENCIA_REPOSO_MS = 5000;

/** Cada cuánto se reescribe la edad de un dato. Nunca cambia más rápido. */
const RELOJ_MS = 5000;

/** Cuántos intentos fallidos seguidos hacen falta para declarar que no hay enlace. */
const TOLERANCIA = 3;

/** Hasta cuánto se afloja entre reintentos. Un buque sin señal no se martilla. */
const ESPERA_MAXIMA_MS = 30_000;

export type Enlace = 'vivo' | 'sin-enlace';

export type PanelVivo = {
  dispositivos: DispositivoVivo[];
  /** El instante contra el que se mide la edad, corregido por el reloj del servidor. */
  ahora: number;
  enlace: Enlace;
};

/**
 * Una huella de lo que la pantalla dibuja, para saber si cambió algo.
 *
 * Es el objeto entero y no sólo las marcas de tiempo de las lecturas: si
 * alguien declara un equipo, retoca un umbral o corrige una escala mientras el
 * panel está abierto, eso también es un cambio que hay que ver. Serializar unos
 * pocos kilobytes cuesta microsegundos y ahorra un render por segundo.
 *
 * `ahora` queda afuera a propósito —viene distinto en cada respuesta— o nada
 * sería nunca igual a nada.
 */
const huellaDe = (dispositivos: DispositivoVivo[]) => JSON.stringify(dispositivos);

/**
 * @param inicial   Lo que dibujó el servidor. El primer render del navegador
 *                  tiene que escribir exactamente esto o hay desajuste de
 *                  hidratación.
 * @param ahoraDelServidor  Su reloj, en el mismo momento.
 * @param cliente   La empresa cuyo panel se mira. Viaja en el pedido porque el
 *                  super mira el de una que no es la suya; el servidor la pasa
 *                  igual por `alcanzaCliente` antes de contestar nada.
 */
export function usePanelVivo(
  inicial: DispositivoVivo[],
  ahoraDelServidor: number,
  cliente: string,
): PanelVivo {
  const [dispositivos, setDispositivos] = useState(inicial);
  const [enlace, setEnlace] = useState<Enlace>('vivo');

  /* La distancia entre el reloj del servidor y el de esta máquina. La edad de
     una lectura se mide contra el primero: una tablet a bordo con la hora
     corrida mostraría, si no, lecturas de ayer o del futuro. Se vuelve a medir
     en cada respuesta, así que se corrige sola. */
  const desfase = useRef(ahoraDelServidor - Date.now());
  const [ahora, setAhora] = useState(ahoraDelServidor);

  /* El reloj de la edad, aparte del enlace: tiene que seguir corriendo aunque
     no llegue ni una respuesta. Una pantalla sin señal que congela el «hace 2
     min» está diciendo que el dato es de hace dos minutos cuando ya es de hace
     una hora, y eso es exactamente lo que este producto promete no hacer. */
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now() + desfase.current), RELOJ_MS);
    return () => clearInterval(reloj);
  }, []);

  /* La última huella vista. En una ref y no en estado: cambia en cada respuesta
     y no tiene por qué provocar un dibujo. */
  const huella = useRef<string | null>(null);

  useEffect(() => {
    let montado = true;
    let turno: ReturnType<typeof setTimeout> | undefined;
    let fallos = 0;
    /* Cuántas respuestas seguidas vinieron iguales. Es lo que decide la
       cadencia: el dato manda el ritmo. */
    let quietas = 0;

    const programar = (espera: number) => {
      if (montado) turno = setTimeout(tic, espera);
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
        const respuesta = await fetch(`/api/lecturas?cliente=${encodeURIComponent(cliente)}`, {
          cache: 'no-store',
        });
        if (!respuesta.ok) throw new Error(String(respuesta.status));
        const cuerpo = await respuesta.json();
        if (!montado) return;

        desfase.current = cuerpo.ahora - Date.now();
        setEnlace('vivo');
        fallos = 0;

        const ahoraHuella = huellaDe(cuerpo.dispositivos);
        if (ahoraHuella === huella.current) {
          /* Nada cambió: no se toca el estado —un render por segundo para
             redibujar lo mismo es trabajo tirado— y se afloja el sondeo. */
          quietas += 1;
          programar(Math.min(CADENCIA_MS * 2 ** quietas, CADENCIA_REPOSO_MS));
          return;
        }

        huella.current = ahoraHuella;
        setDispositivos(cuerpo.dispositivos);
        setAhora(cuerpo.ahora);
        /* Algo se movió: se vuelve a mirar seguido. */
        quietas = 0;
        programar(CADENCIA_MS);
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

    /* Volver a la pestaña pide de nuevo enseguida: nadie espera un segundo
       mirando un número que sabe viejo. */
    const alVolver = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        clearTimeout(turno);
        fallos = 0;
        /* Y se vuelve a la cadencia rápida: quien acaba de mirar la pantalla no
           tiene por qué heredar el reposo en el que estaba. */
        quietas = 0;
        void tic();
      }
    };
    document.addEventListener('visibilitychange', alVolver);

    programar(CADENCIA_MS);

    return () => {
      montado = false;
      clearTimeout(turno);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [cliente]);

  return { dispositivos, ahora, enlace };
}
