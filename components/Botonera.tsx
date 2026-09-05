'use client';

import { usePathname } from 'next/navigation';
import type { Destino, Simbolo } from '@/lib/navegacion';
import { SimboloFrente, SimboloPersonal, SimboloDispositivos } from './instrumentos';

const SIMBOLOS: Record<Simbolo, React.ComponentType> = {
  resumen: SimboloFrente,
  personal: SimboloPersonal,
  dispositivos: SimboloDispositivos,
};

/**
 * Botonera de mandos (−S0): la navegación de las rutas de aplicación.
 *
 * Es un banco de pulsadores **enclavados**. Un pulsador enclavado se queda
 * adentro cuando lo apretás y su lámpara queda encendida hasta que sale, así
 * que "estás acá" no necesita una barra de color inventada: lo dicen el bisel
 * invertido y la lente, que es el idioma que este tablero ya habla.
 *
 * Dos escenas, dos montajes. En el muelle el banco va en el filo de abajo, que
 * es donde llega el pulgar con el teléfono en una mano; en la oficina va en el
 * flanco izquierdo del gabinete, en columna. Es la misma pieza remontada, no
 * una encogida, y por eso la leyenda del banco se cae en el teléfono en vez de
 * achicarse hasta dejar de leerse.
 *
 * Qué mandos monta lo decide el servidor, que ya sabe qué permite el modo
 * puesto: acá no se pregunta por roles ni por permisos, se dibuja la lista.
 */
export function Botonera({ destinos }: { destinos: Destino[] }) {
  const ruta = usePathname();

  return (
    <nav className="botonera" aria-label="Mandos del panel">
      <span className="serigrafia botonera__legenda">−S0 · Mandos</span>

      <ul className="botonera__banco">
        {destinos.map((destino) => {
          /* Una ruta hija deja apretado el mando de su sección: al bajar a
             `/tablero/loquesea` el pulsador no se levanta. */
          const puesto = ruta === destino.href || ruta.startsWith(`${destino.href}/`);
          const Simbolo = SIMBOLOS[destino.simbolo];

          return (
            <li key={destino.href}>
              <a
                className={`mando${puesto ? ' mando--puesto' : ''}`}
                href={destino.href}
                aria-current={puesto ? 'page' : undefined}
              >
                <span className="mando__lampara" aria-hidden="true" />
                <Simbolo />
                <span className="mando__rotulo">{destino.rotulo}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
