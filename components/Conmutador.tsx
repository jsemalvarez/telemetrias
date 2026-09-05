'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROTULO_ROL, type Rol } from '@/lib/auth/roles';
import { Piloto, Tornillo } from './instrumentos';

/**
 * Llave selectora de modo (−S1).
 *
 * Un usuario con varios roles mira el sistema con un sombrero por vez: el jefe
 * de máquinas que además compra no quiere las dos vistas encimadas. La llave
 * elige con cuál está mirando.
 *
 * **El modo restringe y nunca amplía.** El servidor valida la posición contra
 * los roles reales del usuario y calcula los permisos del rol elegido, que es
 * por construcción un subconjunto de los que ya tenía. Por eso esto puede ser
 * una preferencia en una cookie y no una credencial: no hay nada que ganar
 * moviéndola.
 *
 * No se monta con un solo rol — una llave de una sola posición no es una llave.
 */
export function Conmutador({ modos, modo }: { modos: Rol[]; modo: Rol }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cambiando, setCambiando] = useState<Rol | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const llave = useRef<HTMLButtonElement>(null);

  /* Afuera y Escape cierran. El foco vuelve a la llave, que es de donde salió:
     sin eso, cerrar con el teclado deja el foco en la nada. */
  useEffect(() => {
    if (!abierto) return;

    const afuera = (ev: MouseEvent) => {
      if (!caja.current?.contains(ev.target as Node)) setAbierto(false);
    };
    const tecla = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      setAbierto(false);
      llave.current?.focus();
    };

    document.addEventListener('mousedown', afuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', afuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  const mover = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
    ev.preventDefault();
    const opciones = Array.from(caja.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? []);
    const i = opciones.indexOf(document.activeElement as HTMLButtonElement);
    const paso = ev.key === 'ArrowDown' ? 1 : -1;
    const destino = opciones[(i + paso + opciones.length) % opciones.length];
    destino?.focus();
  };

  const girar = async (rol: Rol) => {
    if (rol === modo) {
      setAbierto(false);
      return;
    }
    setCambiando(rol);
    try {
      await fetch('/api/auth/modo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol }),
      });
    } catch {
      /* Sin enlace la posición no se guarda. No se finge que giró: se cierra y
         el riel sigue mostrando la posición real, que es la vieja. */
      setCambiando(null);
      setAbierto(false);
      return;
    }
    setCambiando(null);
    setAbierto(false);
    /* El alcance lo recalcula el servidor: la pantalla se vuelve a pedir en vez
       de que el cliente adivine qué puede mostrar ahora. */
    router.refresh();
  };

  return (
    <div className="selector" ref={caja}>
      <button
        ref={llave}
        type="button"
        className="riel__salida selector__llave"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        <span className="selector__rotulo">Modo</span>
        <span className="selector__posicion">{ROTULO_ROL[modo]}</span>
        <svg viewBox="0 0 10 6" className="selector__flecha" aria-hidden="true">
          <path d="M1 1.5 5 5 9 1.5" />
        </svg>
      </button>

      {abierto && (
        <div className="chapa selector__panel" role="menu" aria-label="Modo de vista" onKeyDown={mover}>
          <Tornillo />
          <Tornillo />
          <Tornillo />
          <Tornillo />
          <span className="serigrafia selector__legenda">−S1 · Modo de vista</span>

          {modos.map((rol) => (
            <button
              key={rol}
              type="button"
              role="menuitemradio"
              aria-checked={rol === modo}
              className="selector__opcion"
              disabled={cambiando !== null}
              onClick={() => girar(rol)}
            >
              <Piloto encendida={rol === modo} etiqueta={ROTULO_ROL[rol]} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
