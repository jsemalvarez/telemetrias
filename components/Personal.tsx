'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CLAVE_MINIMA, esCorreo } from '@/lib/auth/reglas';
import { ROTULO_ROL, type Rol } from '@/lib/auth/roles';
import type { Miembro } from '@/lib/auth/usuarios';
import { Interruptor } from './instrumentos';

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
export function Personal({
  empresa,
  personal,
  otorgables,
}: {
  empresa: string;
  personal: Miembro[];
  /** Los roles que esta sesión puede dar de alta, ya resueltos por el servidor. */
  otorgables: Rol[];
}) {
  const [abierto, setAbierto] = useState(false);
  const puedeCrear = otorgables.length > 0;

  return (
    <main className="registro" id="contenido">
      <div className="marco">
        <div className="regleta registro__panel">
          <div className="regleta__chapa">
            <span className="serigrafia">−A2 · Padrón de personal</span>
          </div>

          <div className="registro__cabeza">
            <div className="registro__texto">
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
                onClick={() => setAbierto((estaba) => !estaba)}
              >
                {abierto ? 'Cerrar alta' : 'Crear personal'}
              </Interruptor>
            ) : null}
          </div>

          {puedeCrear && abierto ? (
            <AltaMiembro rol={otorgables[0]} alCerrar={() => setAbierto(false)} />
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
 * Tres bornes y ninguna llave de rol: para un administrador `rolesQueOtorga`
 * devuelve uno solo —encargado—, y una llave de una sola posición no es una
 * llave. Por eso el rol va grabado en la chapa en lugar de elegirse: quien da
 * el alta ve qué está por crear sin tener que decidirlo.
 *
 * El día que entre alguien que pueda otorgar más de uno —un super parado
 * adentro de una empresa, que hoy no tiene por dónde—, acá va una llave
 * selectora con las posiciones que traiga `otorgables`. El servidor ya la
 * valida: `rolesQueOtorga` decide, este formulario sólo la dibuja.
 */
function AltaMiembro({ rol, alCerrar }: { rol: Rol; alCerrar: () => void }) {
  const router = useRouter();
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
