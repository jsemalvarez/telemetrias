'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CLAVE_MINIMA, esCorreo } from '@/lib/auth/reglas';
import { ROTULO_ROL } from '@/lib/auth/roles';
import type { Sesion } from '@/lib/auth/sesion';
import { Interruptor, Tornillo } from './instrumentos';

/**
 * Tu credencial (−A4): lo único del sistema que una persona administra sola.
 *
 * Dos paneles y no uno, porque son dos clases de acto. Arriba, los datos: el
 * nombre y la dirección, que se corrigen como se corrige cualquier campo.
 * Abajo, la credencial: cambiarla cierra las demás sesiones abiertas, y eso no
 * puede compartir riel con un cambio de nombre ni resolverse con el mismo
 * gesto. Va en su propio gabinete, detrás de una llave que hay que abrir.
 *
 * Lo que no está acá es tan importante como lo que sí: el rol y la empresa se
 * muestran grabados en chapa y no hay dónde tocarlos. Los fija quien administra
 * a esta persona; que aparezcan como un campo gris deshabilitado sería insinuar
 * que en algún estado se editan.
 */
export function Perfil({ sesion, empresa }: { sesion: Sesion; empresa: string }) {
  return (
    <main className="registro" id="contenido">
      <div className="marco perfil">
        <div className="regleta registro__panel">
          <div className="regleta__chapa">
            <span className="serigrafia">−A4 · Tu credencial</span>
          </div>

          <div className="registro__cabeza">
            <div className="registro__texto">
              <h1>Tu credencial</h1>
              <p>
                Con el correo entrás al sistema, y es a donde te van a llegar los avisos. El
                rol y la empresa los fija quien te dio de alta.
              </p>
            </div>
          </div>

          {sesion.claveProvisoria ? <ClaveProvisoria /> : null}

          <Datos sesion={sesion} />

          <div className="chapa perfil__fijo">
            <Tornillo />
            <Tornillo />
            <Tornillo />
            <Tornillo />
            <span className="serigrafia">Lo que no cambiás vos</span>
            <dl className="perfil__pares">
              <div>
                <dt className="serigrafia">Empresa</dt>
                <dd className="cifra">{empresa}</dd>
              </div>
              <div>
                <dt className="serigrafia">{sesion.roles.length === 1 ? 'Rol' : 'Roles'}</dt>
                <dd className="cifra">
                  {sesion.roles.map((rol) => ROTULO_ROL[rol]).join(' · ') || '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <Credencial />
      </div>
    </main>
  );
}

/**
 * La lámpara encendida, explicada.
 *
 * Dice el hecho —la contraseña la eligió otro y ese otro la sabe— y no la
 * consigna. «Por seguridad, cambiá tu contraseña» no le da a nadie con qué
 * decidir; saber que hay una persona con la llave de tu casa, sí.
 */
function ClaveProvisoria() {
  return (
    <div className="aviso aviso--atencion regleta__aviso">
      Tu contraseña te la puso quien te dio de alta, así que esa persona también la sabe.
      Cambiala abajo y la lámpara del riel se apaga.
    </div>
  );
}

type Estado = 'listo' | 'guardando' | 'guardado';

/* ------------------------- Datos: el riel −X8 ------------------------- */

function Datos({ sesion }: { sesion: Sesion }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(sesion.nombre);
  const [correo, setCorreo] = useState(sesion.correo);
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>('listo');
  const aviso = useRef<HTMLDivElement>(null);

  /* El correo es con lo que entrás: cambiarlo pide la contraseña, y el borne
     aparece recién cuando de verdad cambió. Pedirla siempre haría que corregir
     un nombre mal escrito costara lo mismo que mudarse de cuenta. */
  const cambiaCorreo = correo.trim().toLowerCase() !== sesion.correo;
  const sinCambios = nombre.trim() === sesion.nombre && !cambiaCorreo;

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();

    if (!nombre.trim() || !correo.trim()) {
      setError('Ni el nombre ni el correo pueden quedar vacíos.');
      aviso.current?.focus();
      return;
    }
    if (!esCorreo(correo)) {
      setError('Eso no es una dirección de correo. Con eso entrás, así que tiene que ser la tuya.');
      aviso.current?.focus();
      return;
    }
    if (cambiaCorreo && !clave) {
      setError('Estás cambiando con qué entrás: confirmalo con tu contraseña.');
      aviso.current?.focus();
      return;
    }

    setError(null);
    setEstado('guardando');

    let respuesta: Response;
    try {
      respuesta = await fetch('/api/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), correo: correo.trim(), clave }),
      });
    } catch {
      setEstado('listo');
      setError('No hay enlace con el servidor. Revisá la conexión y probá de nuevo.');
      aviso.current?.focus();
      return;
    }

    const cuerpo = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
      setEstado('listo');
      setError(typeof cuerpo?.mensaje === 'string' ? cuerpo.mensaje : 'No se pudo guardar.');
      aviso.current?.focus();
      return;
    }

    setClave('');
    setEstado('guardado');
    /* El riel de arriba muestra tu nombre y tu correo: se le pide al servidor
       que relea la sesión, que el handler acaba de reemitir. */
    router.refresh();
  };

  const malo = Boolean(error);

  return (
    <form className="regleta regleta--alta" onSubmit={enviar} noValidate>
      <div className="regleta__chapa">
        <span className="serigrafia">−X8 · Tus datos</span>
      </div>

      {error && (
        <div className="aviso aviso--error regleta__aviso" role="alert" tabIndex={-1} ref={aviso}>
          {error}
        </div>
      )}

      {!error && estado === 'guardado' && (
        <div className="aviso aviso--ok regleta__aviso" role="status">
          Guardado.
        </div>
      )}

      <div className="regleta__riel">
        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="perfil-nombre">
              Nombre
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X8:1
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="perfil-nombre"
              name="perfil-nombre"
              type="text"
              className="campo__entrada"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setEstado('listo');
              }}
              autoComplete="name"
              aria-describedby="perfil-nombre-pie"
              aria-invalid={malo || undefined}
            />
          </span>
          <span className="borne__pie" id="perfil-nombre-pie">
            Como te ve el resto en pantalla.
          </span>
        </p>

        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="perfil-correo">
              Correo
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X8:2
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="perfil-correo"
              name="perfil-correo"
              type="email"
              className="campo__entrada"
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value);
                setEstado('listo');
              }}
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              aria-describedby="perfil-correo-pie"
              aria-invalid={malo || undefined}
            />
          </span>
          <span className="borne__pie" id="perfil-correo-pie">
            Con esto entrás al sistema.
          </span>
        </p>

        {cambiaCorreo && (
          <p className="borne">
            <span className="borne__cabeza">
              <label className="campo__etiqueta" htmlFor="perfil-confirmar">
                Tu contraseña
              </label>
              <span className="serigrafia borne__designacion" aria-hidden="true">
                −X8:3
              </span>
            </span>
            <span className="hueco hueco--campo">
              <input
                id="perfil-confirmar"
                name="perfil-confirmar"
                type="password"
                className="campo__entrada"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                autoComplete="current-password"
                aria-describedby="perfil-confirmar-pie"
                aria-invalid={malo || undefined}
              />
            </span>
            <span className="borne__pie" id="perfil-confirmar-pie">
              Estás cambiando con qué entrás, así que hay que confirmar que sos vos.
            </span>
          </p>
        )}

        <div className="borne borne--llave">
          <Interruptor type="submit" designacion="−Q8" disabled={estado === 'guardando' || sinCambios}>
            {estado === 'guardando' ? 'Guardando…' : 'Guardar'}
          </Interruptor>
        </div>
      </div>
    </form>
  );
}

/* --------------- Credencial: el gabinete con guarda (−A5) --------------- */

/**
 * El cambio de contraseña vive en su propio panel y detrás de una llave.
 *
 * La guarda no es adorno: guardar acá cierra todas las demás sesiones abiertas
 * de esta persona. Un riel siempre desplegado, al lado de un campo de nombre,
 * invita a apretar sin leer. Éste hay que abrirlo, y lo que se lee antes de
 * abrirlo es la consecuencia.
 */
function Credencial() {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="regleta registro__panel regleta--guarda">
      <div className="regleta__chapa">
        <span className="serigrafia">−A5 · Cambio de credencial</span>
      </div>

      <div className="registro__cabeza">
        <div className="registro__texto">
          <h2>Cambiar la contraseña</h2>
          <p>
            Al guardarla se cierran todas tus otras sesiones abiertas — el teléfono de a
            bordo, la máquina de la oficina. Ésta sigue abierta. Es lo que hace que cambiar
            la contraseña sirva de algo cuando la cambiás porque otro la sabe.
          </p>
        </div>

        <Interruptor
          designacion="−S7"
          className="registro__accion"
          onClick={() => setAbierto((estaba) => !estaba)}
        >
          {abierto ? 'Cerrar' : 'Cambiar contraseña'}
        </Interruptor>
      </div>

      {abierto ? <CambioDeClave alCerrar={() => setAbierto(false)} /> : null}
    </div>
  );
}

function CambioDeClave({ alCerrar }: { alCerrar: () => void }) {
  const router = useRouter();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>('listo');
  const aviso = useRef<HTMLDivElement>(null);
  const primero = useRef<HTMLInputElement>(null);

  useEffect(() => {
    primero.current?.focus();
  }, []);

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();

    if (!actual || !nueva || !repetida) {
      setError('Faltan datos: hay que completar los tres bornes.');
      aviso.current?.focus();
      return;
    }
    if (nueva.length < CLAVE_MINIMA) {
      setError(`La contraseña nueva tiene que ser de ${CLAVE_MINIMA} caracteres o más.`);
      aviso.current?.focus();
      return;
    }
    if (nueva !== repetida) {
      setError('Las dos contraseñas nuevas no coinciden.');
      aviso.current?.focus();
      return;
    }

    setError(null);
    setEstado('guardando');

    let respuesta: Response;
    try {
      respuesta = await fetch('/api/perfil/clave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual, nueva }),
      });
    } catch {
      setEstado('listo');
      setError('No hay enlace con el servidor. Revisá la conexión y probá de nuevo.');
      aviso.current?.focus();
      return;
    }

    const cuerpo = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
      setEstado('listo');
      setError(
        typeof cuerpo?.mensaje === 'string' ? cuerpo.mensaje : 'No se pudo cambiar la contraseña.',
      );
      aviso.current?.focus();
      return;
    }

    setEstado('guardado');
    setActual('');
    setNueva('');
    setRepetida('');
    alCerrar();
    /* La sesión se reemitió del lado del servidor y la lámpara de clave
       provisoria se apagó: se relee la pantalla para que lo muestre. */
    router.refresh();
  };

  const malo = Boolean(error);

  return (
    <form className="regleta regleta--alta" onSubmit={enviar} noValidate>
      <div className="regleta__chapa">
        <span className="serigrafia">−X9 · Contraseña</span>
      </div>

      {error && (
        <div className="aviso aviso--error regleta__aviso" role="alert" tabIndex={-1} ref={aviso}>
          {error}
        </div>
      )}

      <div className="regleta__riel">
        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="clave-actual">
              La de ahora
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X9:1
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="clave-actual"
              name="clave-actual"
              type="password"
              className="campo__entrada"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              ref={primero}
              autoComplete="current-password"
              aria-describedby="clave-actual-pie"
              aria-invalid={malo || undefined}
            />
          </span>
          <span className="borne__pie" id="clave-actual-pie">
            Tener la sesión abierta no es saber la contraseña.
          </span>
        </p>

        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="clave-nueva">
              La nueva
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X9:2
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="clave-nueva"
              name="clave-nueva"
              type="password"
              className="campo__entrada"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              autoComplete="new-password"
              aria-describedby="clave-nueva-pie"
              aria-invalid={malo || undefined}
            />
          </span>
          <span className="borne__pie" id="clave-nueva-pie">
            Mínimo {CLAVE_MINIMA} caracteres. No la sabe nadie más que vos.
          </span>
        </p>

        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="clave-repetida">
              Repetila
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X9:3
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="clave-repetida"
              name="clave-repetida"
              type="password"
              className="campo__entrada"
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
              autoComplete="new-password"
              aria-describedby="clave-repetida-pie"
              aria-invalid={malo || undefined}
            />
          </span>
          <span className="borne__pie" id="clave-repetida-pie">
            Si no coinciden no se guarda nada.
          </span>
        </p>

        <div className="borne borne--llave">
          <Interruptor type="submit" designacion="−Q9" disabled={estado !== 'listo'}>
            {estado === 'listo' ? 'Cambiar y cerrar las otras' : 'Cambiando…'}
          </Interruptor>
        </div>
      </div>
    </form>
  );
}
