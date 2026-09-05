import type { Metadata } from 'next';
import { Clientes } from '@/components/Clientes';
import { Registrador } from '@/components/Registrador';
import { SinHabilitacion } from '@/components/Sesion';
import { modoPorDefecto, permisosDe, puede } from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';
import { clientes } from '@/lib/auth/usuarios';

export const metadata: Metadata = {
  title: 'Resumen — Monitoreo Tecvol',
  description: 'El resumen del panel: lo que tiene delante quien entró, según lo que puede.',
  robots: { index: false, follow: false },
};

/**
 * El resumen: el destino del mando de la botonera y la primera pantalla de la
 * aplicación.
 *
 * Es una sola ruta, y lo que muestra lo decide el permiso del modo puesto. No
 * hay una ruta por rol —eso repartiría la misma pantalla en tres y obligaría a
 * elegir destino antes de saber quién entró—: hay un resumen, y el resumen de
 * cada uno es la pregunta que ese uno trae.
 *
 * Quien cruza el corte entre empresas ve el padrón de clientes; quien lee su
 * propia instalación ve sus mediciones. Un super administrador puede las dos
 * cosas y las mira de a una, girando la llave −S1 del riel.
 */
export default async function ResumenRuta() {
  const sesion = await sesionActual();

  if (puede(sesion, 'cliente:cruzar')) {
    return <Clientes clientes={await clientes()} puedeCrear={puede(sesion, 'cliente:crear')} />;
  }

  if (puede(sesion, 'lectura:ver')) return <Registrador />;

  /* Si el permiso está entre los de todos sus roles pero no entre los del modo
     puesto, el candado lo puso el propio usuario al girar la llave. Es la misma
     pantalla con otra salida: en un caso pide un alta, en el otro se resuelve
     solo, volviendo al modo de mayor alcance que sí abre esta pantalla. */
  const rolesQueLeen = (sesion?.roles ?? []).filter((rol) =>
    permisosDe([rol]).has('lectura:ver'),
  );
  const porElModo = rolesQueLeen.length > 0;

  return (
    <SinHabilitacion
      porElModo={porElModo}
      modoQueHabilita={porElModo ? modoPorDefecto(rolesQueLeen) : null}
    />
  );
}
