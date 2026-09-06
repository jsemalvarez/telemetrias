'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CLAVE_MINIMA, esCorreo } from '@/lib/auth/reglas';
import { ROTULO_ROL, type Rol } from '@/lib/auth/roles';
import type { Miembro } from '@/lib/auth/usuarios';
import { Interruptor, Piloto } from './instrumentos';

/**
 * Padrón de personal (−A2): lo que ve el administrador de una empresa.
 *
 * Lista a los administradores y encargados de su empresa —el personal que la
 * opera— y ofrece el alta. El encargado no llega a esta pantalla: le falta el
 * permiso `personal:ver`, y ése es el corte que lo separa del admin.
 *
 * Monta el mismo panel de registro que el padrón de clientes, y por la misma
 * razón: un registro es una lectura, no una tarjeta, y cada persona va en su
 * propio alojamiento rebajado. Las dos pantallas son gemelas y están escritas
 * igual a propósito — quien entiende una entiende la otra.
 *
 * No pregunta por un rol para decidir si monta el alta: recibe la lista de los
 * que esta sesión puede otorgar. Lista vacía, no hay alta. Quién puede otorgar
 * qué lo decide `rolesQueOtorga`, y lo hace cumplir el servidor.
 */
/**
 * Qué riel está bajado. Uno por vez: abrir el alta cierra un restablecimiento a
 * medio tipear, y al revés. Dos formularios de contraseña abiertos en la misma
 * pantalla son la forma más fácil de escribir la clave de uno en el borne del
 * otro.
 */
type Panel = null | { tipo: 'alta' } | { tipo: 'clave'; miembro: Miembro };

export function Personal({
  empresa,
  cliente,
  personal,
  otorgables,
  yo,
  volver,
}: {
  empresa: string;
  /** El identificador de la empresa, que es lo que viaja en el alta. */
  cliente: string;
  personal: Miembro[];
  /** Los roles que esta sesión puede dar de alta, ya resueltos por el servidor. */
  otorgables: Rol[];
  /** Quién está mirando. Nadie se restablece su propia clave desde acá. */
  yo: string;
  /**
   * Por dónde se sale, cuando se entró desde algún lado. El admin está en su
   * propia empresa y no tiene de dónde volver; el super entró desde el padrón
   * de clientes y tiene que poder ver que está adentro de una, y salir.
   */
  volver?: { href: string; rotulo: string };
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const puedeCrear = otorgables.length > 0;

  /* El servidor lo vuelve a decidir; esto decide si se dibuja el mando. La
     regla es la misma que la del alta, y no es casualidad: quien pudo dar de
     alta una credencial puede reemplazarla, y ni una más. */
  const puedeRestablecer = (miembro: Miembro) =>
    miembro.id !== yo &&
    miembro.roles.length > 0 &&
    miembro.roles.every((rol) => otorgables.includes(rol));

  return (
    <main className="registro" id="contenido">
      <div className="marco">
        <div className="regleta registro__panel">
          <div className="regleta__chapa">
            <span className="serigrafia">−A2 · Padrón de personal</span>
          </div>

          <div className="registro__cabeza">
            <div className="registro__texto">
              {volver ? (
                <a className="registro__volver" href={volver.href}>
                  <span aria-hidden="true">←</span> {volver.rotulo}
                </a>
              ) : null}
              <h1>Personal</h1>
              <p>
                Los administradores y encargados de {empresa} — el personal que opera la
                empresa. El administrador los da de alta; el encargado no llega a esta
                pantalla.
              </p>
            </div>

            {puedeCrear ? (
              <Interruptor
                designacion="−S6"
                className="registro__accion"
                onClick={() =>
                  setPanel((antes) => (antes?.tipo === 'alta' ? null : { tipo: 'alta' }))
                }
              >
                {panel?.tipo === 'alta' ? 'Cerrar alta' : 'Crear personal'}
              </Interruptor>
            ) : null}
          </div>

          {puedeCrear && panel?.tipo === 'alta' ? (
            <AltaMiembro
              cliente={cliente}
              otorgables={otorgables}
              alCerrar={() => setPanel(null)}
            />
          ) : null}

          {panel?.tipo === 'clave' ? (
            <RestablecerClave miembro={panel.miembro} alCerrar={() => setPanel(null)} />
          ) : null}

          <ul className="registro__lista">
            {personal.map((miembro) => (
              <li className="hueco fila" key={miembro.id}>
                <h2 className="fila__titulo">{miembro.nombre}</h2>
                <span className="fila__sub cifra">{miembro.correo}</span>
                <span className="fila__aside">
                  {miembro.roles.map((rol) => (
                    <span className="serigrafia fila__rol" key={rol}>
                      {ROTULO_ROL[rol]}
                    </span>
                  ))}
                  {puedeRestablecer(miembro) ? (
                    <button
                      type="button"
                      className="fila__accion"
                      onClick={() => setPanel({ tipo: 'clave', miembro })}
                    >
                      Restablecer clave
                      <span className="oculto-visual"> de {miembro.nombre}</span>
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

type Estado = 'listo' | 'dando' | 'ok';

/**
 * El riel del alta (−X6).
 *
 * La llave de rol (−S8) se monta sólo si hay más de una posición. Para un
 * administrador `rolesQueOtorga` devuelve una sola —encargado— y una llave de
 * una sola posición no es una llave: ahí el rol va grabado en la chapa y no se
 * elige. El super parado adentro de un cliente puede otorgar dos, así que a él
 * la llave le aparece. Es la misma pieza decidiendo las dos veces; la pantalla
 * no sabe de roles, dibuja lo que el servidor le pasó.
 *
 * La chapa dice siempre qué se está por crear, gire donde gire la llave.
 */
function AltaMiembro({
  cliente,
  otorgables,
  alCerrar,
}: {
  cliente: string;
  otorgables: Rol[];
  alCerrar: () => void;
}) {
  const router = useRouter();
  const [rol, setRol] = useState<Rol>(otorgables[0]);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>('listo');
  const aviso = useRef<HTMLDivElement>(null);
  const primero = useRef<HTMLInputElement>(null);

  /* El riel se abrió por una acción del usuario: el foco va al primer borne y
     no lo obliga a buscarlo con el tabulador. */
  useEffect(() => {
    primero.current?.focus();
  }, []);

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();

    if (!nombre.trim() || !correo.trim() || !clave) {
      setError('Faltan datos: hay que completar los tres bornes.');
      aviso.current?.focus();
      return;
    }

    /* El servidor lo vuelve a decidir por su cuenta. Esto está acá para que un
       error de tipeo se vea ahora y no después de mandar el pedido. */
    if (!esCorreo(correo)) {
      setError(
        'Eso no es una dirección de correo. Con eso entra al sistema, así que tiene que ser la suya.',
      );
      aviso.current?.focus();
      return;
    }

    setError(null);
    setEstado('dando');

    let respuesta: Response;
    try {
      respuesta = await fetch('/api/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          correo: correo.trim(),
          clave,
          /* Va una lista porque una persona puede llevar varios roles; hoy la
             pantalla manda uno. Cuál puede ser lo decidió el servidor. */
          roles: [rol],
          /* La empresa donde cae el alta. El servidor no la cree: la pasa por
             `alcanzaCliente` antes de escribir nada. */
          cliente,
        }),
      });
    } catch {
      /* En este producto quedarse sin señal es normal, no una falla. */
      setEstado('listo');
      setError('No hay enlace con el servidor. Revisá la conexión y probá de nuevo.');
      aviso.current?.focus();
      return;
    }

    const cuerpo = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
      setEstado('listo');
      setError(typeof cuerpo?.mensaje === 'string' ? cuerpo.mensaje : 'No se pudo dar el alta.');
      aviso.current?.focus();
      return;
    }

    setEstado('ok');
    alCerrar();
    /* La lista la arma el servidor: se le pide que la relea en vez de meter la
       fila a mano acá, así lo que se ve es lo que quedó guardado. */
    router.refresh();
  };

  const malo = Boolean(error);

  return (
    <form className="regleta regleta--alta" onSubmit={enviar} noValidate>
      <div className="regleta__chapa">
        <span className="serigrafia">−X6 · Alta de {ROTULO_ROL[rol].toLowerCase()}</span>
      </div>

      {error && (
        <div className="aviso aviso--error regleta__aviso" role="alert" tabIndex={-1} ref={aviso}>
          {error}
        </div>
      )}

      <div className="regleta__riel">
        {otorgables.length > 1 ? (
          <p className="borne">
            <span className="borne__cabeza">
              <span className="campo__etiqueta" id="miembro-rol">
                Rol
              </span>
              <span className="serigrafia borne__designacion" aria-hidden="true">
                −S8
              </span>
            </span>
            <span className="borne__posiciones" role="radiogroup" aria-labelledby="miembro-rol">
              {otorgables.map((posicion) => (
                <button
                  key={posicion}
                  type="button"
                  role="radio"
                  aria-checked={posicion === rol}
                  className="borne__posicion"
                  onClick={() => setRol(posicion)}
                >
                  <Piloto encendida={posicion === rol} etiqueta={ROTULO_ROL[posicion]} />
                </button>
              ))}
            </span>
            <span className="borne__pie">Con qué alcance entra al sistema.</span>
          </p>
        ) : null}

        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="miembro-nombre">
              Nombre
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X6:1
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="miembro-nombre"
              name="miembro-nombre"
              type="text"
              className="campo__entrada"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              ref={primero}
              autoComplete="name"
              aria-describedby="miembro-nombre-pie"
              aria-invalid={malo || undefined}
            />
          </span>
          <span className="borne__pie" id="miembro-nombre-pie">
            Como se muestra en pantalla.
          </span>
        </p>

        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="miembro-correo">
              Correo
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X6:2
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="miembro-correo"
              name="miembro-correo"
              type="email"
              className="campo__entrada"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoComplete="off"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              aria-describedby="miembro-correo-pie"
              aria-invalid={malo || undefined}
            />
          </span>
          <span className="borne__pie" id="miembro-correo-pie">
            Con esto entra al sistema, y es a donde le van a llegar los avisos.
          </span>
        </p>

        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="miembro-clave">
              Contraseña
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X6:3
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="miembro-clave"
              name="miembro-clave"
              type="password"
              className="campo__entrada"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="new-password"
              aria-describedby="miembro-clave-pie"
              aria-invalid={malo || undefined}
            />
          </span>
          <span className="borne__pie" id="miembro-clave-pie">
            Mínimo {CLAVE_MINIMA} caracteres. Se la entregás vos, y hasta que la cambie la
            sabés vos también: el sistema se lo va a recordar en cada sesión.
          </span>
        </p>

        <div className="borne borne--llave">
          <Interruptor type="submit" designacion="−Q6" disabled={estado !== 'listo'}>
            {estado === 'listo' ? 'Dar de alta' : 'Dando de alta…'}
          </Interruptor>
        </div>
      </div>
    </form>
  );
}

/* ---------------- Restablecer una clave ajena: el riel −X7 ---------------- */

/**
 * La contraseña de otro, puesta de nuevo por quien lo administra.
 *
 * Es la recuperación que este producto puede dar hoy, y encaja con cómo
 * trabaja: el encargado de un buque sin señal no puede seguir un enlace que le
 * llegó por correo, pero sí puede llamar a su administrador.
 *
 * Lo que sale de acá es una contraseña provisoria —la eligió otro— y la lámpara
 * del riel se lo va a recordar a su dueño hasta que ponga la suya. Guardar
 * cierra además las sesiones abiertas de esa persona, y el riel lo dice antes
 * de apretar: quien restablece porque una credencial se filtró tiene que saber
 * que eso es justamente lo que está haciendo.
 *
 * Pide la contraseña de quien administra. Restablecer no crea una credencial
 * nueva: se mete adentro de una que ya es de alguien, con su nombre y su
 * historia. Una sesión de administrador olvidada abierta no debería alcanzar.
 */
function RestablecerClave({ miembro, alCerrar }: { miembro: Miembro; alCerrar: () => void }) {
  const router = useRouter();
  const [clave, setClave] = useState('');
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

    if (!clave || !nueva || !repetida) {
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
    setEstado('dando');

    let respuesta: Response;
    try {
      respuesta = await fetch(`/api/personal/${miembro.id}/clave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave, nueva }),
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
      setError(typeof cuerpo?.mensaje === 'string' ? cuerpo.mensaje : 'No se pudo restablecer.');
      aviso.current?.focus();
      return;
    }

    setEstado('ok');
    alCerrar();
    router.refresh();
  };

  const malo = Boolean(error);

  return (
    <form className="regleta regleta--alta regleta--guarda" onSubmit={enviar} noValidate>
      <div className="regleta__chapa">
        <span className="serigrafia">−X7 · Nueva contraseña para {miembro.nombre}</span>
      </div>

      {error && (
        <div className="aviso aviso--error regleta__aviso" role="alert" tabIndex={-1} ref={aviso}>
          {error}
        </div>
      )}

      <div className="aviso aviso--atencion regleta__aviso">
        Al guardarla se cierran las sesiones que {miembro.nombre} tenga abiertas, y le queda
        una contraseña provisoria que le vas a tener que pasar vos.
      </div>

      <div className="regleta__riel">
        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="reponer-tuya">
              Tu contraseña
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X7:1
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="reponer-tuya"
              name="reponer-tuya"
              type="password"
              className="campo__entrada"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              ref={primero}
              autoComplete="current-password"
              aria-describedby="reponer-tuya-pie"
              aria-invalid={malo || undefined}
            />
          </span>
          <span className="borne__pie" id="reponer-tuya-pie">
            Estás entrando a una credencial ajena: confirmá que sos vos.
          </span>
        </p>

        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="reponer-nueva">
              La nueva
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X7:2
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="reponer-nueva"
              name="reponer-nueva"
              type="password"
              className="campo__entrada"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              autoComplete="new-password"
              aria-describedby="reponer-nueva-pie"
              aria-invalid={malo || undefined}
            />
          </span>
          <span className="borne__pie" id="reponer-nueva-pie">
            Mínimo {CLAVE_MINIMA} caracteres. Se la entregás vos.
          </span>
        </p>

        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="reponer-repetida">
              Repetila
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X7:3
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="reponer-repetida"
              name="reponer-repetida"
              type="password"
              className="campo__entrada"
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
              autoComplete="new-password"
              aria-describedby="reponer-repetida-pie"
              aria-invalid={malo || undefined}
            />
          </span>
          <span className="borne__pie" id="reponer-repetida-pie">
            Si no coinciden no se guarda nada.
          </span>
        </p>

        <div className="borne borne--llave">
          <Interruptor type="submit" designacion="−Q7" disabled={estado !== 'listo'}>
            {estado === 'listo' ? 'Restablecer' : 'Restableciendo…'}
          </Interruptor>
        </div>
      </div>
    </form>
  );
}
