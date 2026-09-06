'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CONTACTO } from '@/lib/datos';
import { Interruptor, Tornillo } from './instrumentos';

/**
 * Pantalla de acceso.
 *
 * La validación es real: `/api/auth/entrar` verifica la contraseña contra su
 * hash y, si está bien, deja la sesión en dos cookies httpOnly. Esta pantalla
 * nunca ve el token — no puede, y ese es el punto.
 *
 * Se entra con el correo: no hay un nombre de usuario aparte. Una identidad
 * sola, que además es el único lugar a donde el sistema podría avisarle algo a
 * esta persona.
 */

/* Espejo de la semilla del padrón, para poder mostrar la credencial en pantalla
   sin importar el módulo del servidor (que lleva hashes y no puede viajar al
   navegador). Las dos chapas de abajo se retiran cuando haya altas reales. */
const DEMOSTRACION = { correo: 'demo@tecvol.com.ar', clave: 'tecvol' };

type Estado = 'listo' | 'validando' | 'ok';

export function Acceso({ destino = '/tablero' }: { destino?: string }) {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>('listo');
  const aviso = useRef<HTMLDivElement>(null);

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();

    if (!correo.trim() || !clave.trim()) {
      setError('Faltan datos: hay que completar los dos bornes.');
      aviso.current?.focus();
      return;
    }

    setError(null);
    setEstado('validando');

    let respuesta: Response;
    try {
      respuesta = await fetch('/api/auth/entrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correo.trim(), clave }),
      });
    } catch {
      /* En este producto quedarse sin señal es normal, no una falla: el aviso
         tiene que decir eso y no "error inesperado". */
      setEstado('listo');
      setError('No hay enlace con el servidor. Revisá la conexión y probá de nuevo.');
      aviso.current?.focus();
      return;
    }

    const cuerpo = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
      setEstado('listo');
      const base = typeof cuerpo?.mensaje === 'string' ? cuerpo.mensaje : 'No se pudo habilitar el acceso.';
      setError(
        cuerpo?.error === 'credenciales'
          ? `${base} La credencial de demostración está abajo a la izquierda.`
          : base,
      );
      aviso.current?.focus();
      return;
    }

    setEstado('ok');
    /* `replace` para que el botón de volver no rebote al acceso ya cumplido, y
       `refresh` para que el servidor relea la cookie recién puesta. */
    router.replace(destino);
    router.refresh();
  };

  const malo = Boolean(error);

  return (
    <main className="acceso" id="contenido">
      <div className="marco acceso__marco">
        <div className="acceso__cabeza">
          <h1>Acceso al monitoreo</h1>
          <p className="acceso__bajada">
            Las credenciales las entrega Tecvol al dar de alta el equipo. No hay registro
            público: el acceso se habilita por buque.
          </p>
        </div>

        <form className="regleta" onSubmit={enviar} noValidate>
          <div className="regleta__chapa">
            <span className="serigrafia">−X0 · Bornera de acceso</span>
          </div>

          {error && (
            <div className="aviso aviso--error regleta__aviso" role="alert" tabIndex={-1} ref={aviso}>
              {error}
            </div>
          )}

          <div className="regleta__riel">
            <p className="borne">
              <span className="borne__cabeza">
                <label className="campo__etiqueta" htmlFor="correo">
                  Correo
                </label>
                <span className="serigrafia borne__designacion" aria-hidden="true">
                  −X0:1
                </span>
              </span>
              <span className="hueco hueco--campo">
                <input
                  id="correo"
                  name="correo"
                  type="email"
                  className="campo__entrada"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  autoComplete="email"
                  /* El teclado del teléfono trae la arroba sin que haya que ir a
                     buscarla, y no arranca en mayúscula: esto se tipea a bordo. */
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={malo || undefined}
                />
              </span>
            </p>

            <p className="borne">
              <span className="borne__cabeza">
                <label className="campo__etiqueta" htmlFor="clave">
                  Contraseña
                </label>
                <span className="serigrafia borne__designacion" aria-hidden="true">
                  −X0:2
                </span>
              </span>
              <span className="hueco hueco--campo">
                <input
                  id="clave"
                  name="clave"
                  type="password"
                  className="campo__entrada"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  autoComplete="current-password"
                  aria-invalid={malo || undefined}
                />
              </span>
            </p>

            {/* La habilitación es una llave, no un borne: por eso lleva −Q, y
                va al extremo del riel, donde entra la alimentación. */}
            <div className="borne borne--llave">
              <Interruptor type="submit" designacion="−Q0" disabled={estado !== 'listo'}>
                {estado === 'listo' ? 'Entrar' : 'Habilitando…'}
              </Interruptor>
            </div>
          </div>
        </form>

        <div className="acceso__chapas">
          <div className="chapa acceso__demo">
            <Tornillo />
            <Tornillo />
            <Tornillo />
            <Tornillo />
            <span className="serigrafia">Credencial de demostración</span>
            <dl className="acceso__credencial">
              <div>
                <dt className="serigrafia">Correo</dt>
                <dd className="cifra">{DEMOSTRACION.correo}</dd>
              </div>
              <div>
                <dt className="serigrafia">Contraseña</dt>
                <dd className="cifra">{DEMOSTRACION.clave}</dd>
              </div>
            </dl>
          </div>

          <div className="chapa acceso__pedir">
            <Tornillo />
            <Tornillo />
            <Tornillo />
            <Tornillo />
            <span className="serigrafia">Sin credencial</span>
            <p>
              El alta la hace Tecvol junto con la instalación del equipo. Pedila por WhatsApp al{' '}
              <a href={CONTACTO.whatsappUrl} className="cifra">
                {CONTACTO.whatsapp}
              </a>{' '}
              o a <a href={`mailto:${CONTACTO.email}`}>{CONTACTO.email}</a>, con el nombre del
              buque.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
