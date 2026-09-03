import type { Metadata } from 'next';
import { Riel } from '@/components/secciones';
import { Salida } from '@/components/Sesion';
import { Registrador } from '@/components/Registrador';

export const metadata: Metadata = {
  title: 'Tablero — Monitoreo Tecvol',
  description: 'Registrador de faja de la flota: estado, alarmas e historia de las últimas 24 h.',
  robots: { index: false, follow: false },
};

export default function TableroRuta() {
  return (
    <>
      <Riel variante="minimo" derecha={<Salida />} />
      <Registrador />
    </>
  );
}
