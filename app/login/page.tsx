import type { Metadata } from 'next';
import { Riel } from '@/components/secciones';
import { Acceso } from '@/components/Acceso';

export const metadata: Metadata = {
  title: 'Acceso — Monitoreo Tecvol',
  description: 'Entrada al monitoreo remoto de tableros eléctricos navales Tecvol.',
  robots: { index: false, follow: false },
};

export default function Login() {
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
      <Acceso />
    </>
  );
}
