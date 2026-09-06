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
 * Cada cuánto se vuelve a pedir el panel.
 *
 * Un segundo es el número que hace que una perilla girando se vea girar. Es
 * también el que más caro sale en serverless —una invocación por segundo y por
 * pantalla abierta—, así que es el primero que baja cuando entre el empuje.
 * **Si en la demo la aguja se siente atrasada, éste es el número que se toca**,
 * junto con la transición de la aguja en `.medidor__aguja`.
 */
export const CADENCIA_MS = 1000;

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

  useEffect(() => {
    let montado = true;
    let turno: ReturnType<typeof setTimeout> | undefined;
    let fallos = 0;

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
        setDispositivos(cuerpo.dispositivos);
        setAhora(cuerpo.ahora);
        setEnlace('vivo');
        fallos = 0;
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
