'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CONTACTO } from '@/lib/datos';
import { Interruptor, Tornillo } from './instrumentos';

/**
 * Pantalla de acceso.
 *
 * ESTO NO ES AUTENTICACIÓN. Es una compuerta de demostración: valida contra una
 * credencial fija que la propia pantalla muestra, para que delante del cliente
 * se vea la validación y el error funcionando. No hay backend, no hay sesión
 * real y no hay nada que proteger todavía. Cuando exista el proveedor de
 * autenticación, `validar` pasa a ser una llamada al servidor y el resto del
 * componente no cambia.
 */
const DEMO = { usuario: 'demo', clave: 'tecvol' };

type Estado = 'listo' | 'validando' | 'ok';

export function Acceso() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>('listo');
  const aviso = useRef<HTMLDivElement>(null);

  const enviar = (ev: React.FormEvent) => {
    ev.preventDefault();

    if (!usuario.trim() || !clave.trim()) {
      setError('Faltan datos: hay que completar los dos bornes.');
      aviso.current?.focus();
      return;
    }

    setError(null);
    setEstado('validando');

    window.setTimeout(() => {
      if (usuario.trim() !== DEMO.usuario || clave !== DEMO.clave) {
        setEstado('listo');
        setError('Usuario o contraseña incorrectos. La credencial de demostración está abajo a la izquierda.');
        aviso.current?.focus();
        return;
      }
      try {
        sessionStorage.setItem('tecvol:demo', usuario.trim());
      } catch {
        /* Navegador con almacenamiento bloqueado: el destino lo resuelve solo. */
      }
      setEstado('ok');
      router.push('/tablero');
    }, 520);
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
                <label className="campo__etiqueta" htmlFor="usuario">
                  Usuario
                </label>
                <span className="serigrafia borne__designacion" aria-hidden="true">
                  −X0:1
                </span>
              </span>
              <span className="hueco hueco--campo">
                <input
                  id="usuario"
                  name="usuario"
                  type="text"
                  className="campo__entrada"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  autoComplete="username"
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
                <dt className="serigrafia">Usuario</dt>
                <dd className="cifra">{DEMO.usuario}</dd>
              </div>
              <div>
                <dt className="serigrafia">Contraseña</dt>
                <dd className="cifra">{DEMO.clave}</dd>
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
