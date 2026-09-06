'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CLAVE_MINIMA, esCorreo } from '@/lib/auth/reglas';
import { aIdentificador } from '@/lib/identificador';
import type { Cliente } from '@/lib/auth/usuarios';
import { Interruptor } from './instrumentos';

/**
 * Padrón de clientes (−A0): el resumen del super administrador.
 *
 * Es la única pantalla del sistema que cruza el corte entre empresas, así que
 * dice cuál es ese corte en vez de dar por sabido que quien la mira sabe lo que
 * está viendo. Cada cliente va en su propio alojamiento rebajado —un registro
 * es una lectura del padrón, no una tarjeta— con el identificador que viaja en
 * el token de sus sesiones.
 *
 * El alta ya tiene tensión: −S5 baja el riel −X5 y el alta va a la base. Da de
 * alta la empresa y su primer administrador de una sola vez, porque una empresa
 * sin administrador no la puede abrir nadie.
 */
export function Clientes({ clientes, puedeCrear }: { clientes: Cliente[]; puedeCrear: boolean }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <main className="registro" id="contenido">
      <div className="marco">
        <div className="regleta registro__panel">
          <div className="regleta__chapa">
            <span className="serigrafia">−A0 · Padrón de clientes</span>
          </div>

          <div className="registro__cabeza">
            <div className="registro__texto">
              <h1>Clientes</h1>
              <p>
                Las empresas dadas de alta en el sistema. Cada una ve solamente su propio
                equipamiento; ésta es la única pantalla que cruza ese corte.
              </p>
            </div>

            {puedeCrear ? (
              <Interruptor
                designacion="−S5"
                className="registro__accion"
                onClick={() => setAbierto((estaba) => !estaba)}
              >
                {abierto ? 'Cerrar alta' : 'Crear cliente'}
              </Interruptor>
            ) : null}
          </div>

          {puedeCrear && abierto ? <AltaCliente alCerrar={() => setAbierto(false)} /> : null}

          <ul className="registro__lista">
            {clientes.map((cliente) => (
              <li className="hueco fila fila--enlace" key={cliente.id}>
                {/* El enlace envuelve sólo al titular y se estira sobre la fila
                    entera con un pseudoelemento: así el alojamiento sigue
                    siendo la grilla que era, y lo que anuncia un lector de
                    pantalla es el nombre de la empresa y no todo el renglón. */}
                <h2 className="fila__titulo">
                  {/* Al segmento y no a la raíz del cliente: la raíz redirige
                      acá, y un salto de más en el destino de cada clic del
                      padrón se paga en la pantalla chica, donde la conexión es
                      lo que es. */}
                  <a className="fila__enlace" href={`/tablero/clientes/${cliente.id}/personal`}>
                    {cliente.rotulo}
                  </a>
                </h2>
                <span className="fila__sub cifra">{cliente.id}</span>
                <span className="fila__aside fila__cuenta">
                  <span className="cifra fila__numero">{cliente.usuarios}</span>
                  <span className="serigrafia">{cliente.usuarios === 1 ? 'usuario' : 'usuarios'}</span>
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
 * El riel del alta (−X5).
 *
 * Un solo formulario para las dos cosas. El identificador no se tipea: se
 * deriva del nombre y se muestra mientras se escribe, porque es lo que va a
 * viajar en el token de esa empresa y quien da el alta tiene derecho a verlo
 * antes de apretar. El servidor lo vuelve a derivar por su cuenta — lo que
 * llega del navegador no se usa para nombrar nada.
 */
function AltaCliente({ alCerrar }: { alCerrar: () => void }) {
  const router = useRouter();
  const [empresa, setEmpresa] = useState('');
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

  const identificador = aIdentificador(empresa);

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();

    if (!empresa.trim() || !nombre.trim() || !correo.trim() || !clave) {
      setError('Faltan datos: hay que completar los cuatro bornes.');
      aviso.current?.focus();
      return;
    }

    /* El servidor lo vuelve a decidir por su cuenta. Esto está acá para que un
       error de tipeo se vea ahora y no después de mandar el pedido. */
    if (!esCorreo(correo)) {
      setError('Eso no es una dirección de correo. Con eso entra al sistema, así que tiene que ser la suya.');
      aviso.current?.focus();
      return;
    }

    setError(null);
    setEstado('dando');

    let respuesta: Response;
    try {
      respuesta = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa: empresa.trim(),
          admin: { correo: correo.trim(), nombre: nombre.trim(), clave },
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
        <span className="serigrafia">−X5 · Alta de empresa</span>
      </div>

      {error && (
        <div className="aviso aviso--error regleta__aviso" role="alert" tabIndex={-1} ref={aviso}>
          {error}
        </div>
      )}

      <div className="regleta__riel">
        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="empresa">
              Empresa
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X5:1
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="empresa"
              name="empresa"
              type="text"
              className="campo__entrada"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              ref={primero}
              autoComplete="organization"
              spellCheck={false}
              aria-describedby="empresa-id"
              aria-invalid={malo || undefined}
            />
          </span>
          <span className="borne__pie" id="empresa-id">
            {identificador ? (
              <>
                Identificador: <span className="cifra">{identificador}</span>
              </>
            ) : (
              'El identificador sale del nombre.'
            )}
          </span>
        </p>

        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="admin-nombre">
              Administrador
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X5:2
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="admin-nombre"
              name="admin-nombre"
              type="text"
              className="campo__entrada"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="name"
              aria-describedby="admin-nombre-pie"
              aria-invalid={malo || undefined}
            />
          </span>
          <span className="borne__pie" id="admin-nombre-pie">
            Su nombre, como se muestra en pantalla.
          </span>
        </p>

        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="admin-correo">
              Correo
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X5:3
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="admin-correo"
              name="admin-correo"
              type="email"
              className="campo__entrada"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoComplete="off"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              aria-describedby="admin-correo-pie"
              aria-invalid={malo || undefined}
            />
          </span>
          <span className="borne__pie" id="admin-correo-pie">
            Con esto entra al sistema, y es a donde le van a llegar los avisos.
          </span>
        </p>

        <p className="borne">
          <span className="borne__cabeza">
            <label className="campo__etiqueta" htmlFor="admin-clave">
              Contraseña
            </label>
            <span className="serigrafia borne__designacion" aria-hidden="true">
              −X5:4
            </span>
          </span>
          <span className="hueco hueco--campo">
            <input
              id="admin-clave"
              name="admin-clave"
              type="password"
              className="campo__entrada"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="new-password"
              aria-describedby="admin-clave-pie"
              aria-invalid={malo || undefined}
            />
          </span>
          <span className="borne__pie" id="admin-clave-pie">
            Mínimo {CLAVE_MINIMA} caracteres. Se la entregás vos; el sistema no la muestra
            nunca más.
          </span>
        </p>

        <div className="borne borne--llave">
          <Interruptor type="submit" designacion="−Q5" disabled={estado !== 'listo'}>
            {estado === 'listo' ? 'Dar de alta' : 'Dando de alta…'}
          </Interruptor>
        </div>
      </div>
    </form>
  );
}
