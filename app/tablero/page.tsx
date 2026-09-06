import type { Metadata } from 'next';
import { Clientes } from '@/components/Clientes';
import { Panel } from '@/components/Panel';
import { SinHabilitacion } from '@/components/Sesion';
import { modoPorDefecto, permisosDe, puede } from '@/lib/auth/roles';
import { sesionActual } from '@/lib/auth/servidor';
import { clientes, rotuloCliente } from '@/lib/auth/usuarios';
import { panelDe } from '@/lib/telemetria/panel';

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
 *
 * Hasta el 2026-09-06 «sus mediciones» era el registrador de demostración, con
 * datos de fantasía: no había lecturas reales que mostrar. Ahora las hay, así
 * que acá va el panel de verdad — el que muestra lo que hay y nada cuando no
 * hay nada. El registrador se mudó a /tablero/demostracion, entero y sin
 * cambios: es la pantalla que dice a dónde va esto cuando haya parque
 * instalado, y para eso hay que poder verla.
 */
export default async function ResumenRuta() {
  const sesion = await sesionActual();

  if (puede(sesion, 'cliente:cruzar')) {
    return <Clientes clientes={await clientes()} puedeCrear={puede(sesion, 'cliente:crear')} />;
  }

  if (sesion && puede(sesion, 'lectura:ver')) {
    return (
      <Panel
        empresa={await rotuloCliente(sesion.cliente)}
        cliente={sesion.cliente}
        dispositivos={await panelDe(sesion.cliente)}
        ahora={Date.now()}
      />
    );
  }

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
