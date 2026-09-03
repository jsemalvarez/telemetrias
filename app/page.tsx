import { ProveedorVivo } from '@/lib/vivo';
import { Travelling } from '@/components/Travelling';
import { Flota } from '@/components/Flota';
import { Demo } from '@/components/Demo';
import { Riel, Alcance, Prueba, Pie } from '@/components/secciones';

export default function Landing() {
  return (
    /* Una sola fuente de lecturas vivas para toda la página: el dato que corre
       en el instrumento del primer viewport es el mismo que se lee en la flota. */
    <ProveedorVivo>
      <Riel />
      <main>
        <Travelling />
        <Flota />
        <Alcance />
        <Prueba />
        <Demo />
      </main>
      <Pie />
    </ProveedorVivo>
  );
}
