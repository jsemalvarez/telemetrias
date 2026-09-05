import type { Metadata } from 'next';
import { Riel } from '@/components/secciones';
import { Acceso } from '@/components/Acceso';
import { destinoSeguro } from '@/lib/auth/cookies';

export const metadata: Metadata = {
  title: 'Acceso — Monitoreo Tecvol',
  description: 'Entrada al monitoreo remoto de tableros eléctricos navales Tecvol.',
  robots: { index: false, follow: false },
};

/**
 * `destino` es a dónde iba el usuario cuando lo mandamos a identificarse. Se
 * lava acá y no en el cliente: es un parámetro de la URL, o sea, de cualquiera.
 */
export default function Login({ searchParams }: { searchParams?: { destino?: string } }) {
  return (
    <>
      <Riel
        variante="minimo"
        derecha={
          <a className="riel__salida" href="/">
            Volver al sitio
          </a>
        }
      />
      <Acceso destino={destinoSeguro(searchParams?.destino)} />
    </>
  );
}
