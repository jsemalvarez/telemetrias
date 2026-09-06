/* Instrumentos de frente de tablero. Geometría, no decoración:
   un solo grosor de trazo, naranja sólo donde hay señal activa. */

type MedidorProps = {
  valor: number;
  min: number;
  max: number;
  etiqueta: string;
  unidad: string;
  decimales?: number;
  atencion?: boolean;
};

/** Voltímetro / amperímetro de aguja. Escala de 240°, cero abajo a la izquierda. */
export function Medidor({
  valor,
  min,
  max,
  etiqueta,
  unidad,
  decimales = 0,
  atencion = false,
}: MedidorProps) {
  const ARCO = 240;
  const INICIO = 150;
  const frac = Math.min(1, Math.max(0, (valor - min) / (max - min)));
  const angulo = INICIO + frac * ARCO;

  /* Redondeado en origen: el servidor y el cliente tienen que escribir
     exactamente la misma cadena, o React reporta desajuste de hidratación. */
  const punto = (grados: number, radio: number) => {
    const rad = (grados * Math.PI) / 180;
    return [
      Number((60 + radio * Math.cos(rad)).toFixed(3)),
      Number((60 + radio * Math.sin(rad)).toFixed(3)),
    ] as const;
  };

  const marcas = Array.from({ length: 25 }, (_, i) => {
    const mayor = i % 4 === 0;
    const g = INICIO + (i / 24) * ARCO;
    const [x1, y1] = punto(g, mayor ? 38 : 42);
    const [x2, y2] = punto(g, 46);
    return { x1, y1, x2, y2, mayor, key: i };
  });

  const [ax, ay] = punto(angulo, 36);
  const [cx, cy] = punto(angulo + 180, 6);

  return (
    <figure className="medidor">
      <svg viewBox="0 0 120 120" role="img" aria-label={`${etiqueta}: ${valor.toFixed(decimales)} ${unidad}`}>
        <circle cx="60" cy="60" r="55" className="medidor__caja" />
        <circle cx="60" cy="60" r="49" className="medidor__esfera" />
        {marcas.map((m) => (
          <line
            key={m.key}
            x1={m.x1}
            y1={m.y1}
            x2={m.x2}
            y2={m.y2}
            className={m.mayor ? 'medidor__marca medidor__marca--mayor' : 'medidor__marca'}
          />
        ))}
        <line
          x1={cx}
          y1={cy}
          x2={ax}
          y2={ay}
          className={atencion ? 'medidor__aguja medidor__aguja--atencion' : 'medidor__aguja'}
        />
        <circle cx="60" cy="60" r="5" className="medidor__eje" />
        <text x="60" y="86" className="medidor__unidad">
          {unidad}
        </text>
      </svg>
      <figcaption className="serigrafia medidor__pie">{etiqueta}</figcaption>
    </figure>
  );
}

/** Lámpara de señalización con su bisel roscado. */
export function Piloto({
  encendida,
  color = 'naranja',
  etiqueta,
}: {
  encendida: boolean;
  color?: 'naranja' | 'alarma' | 'ok';
  etiqueta: string;
}) {
  return (
    <div className="piloto">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="17" className="piloto__bisel" />
        <circle cx="20" cy="20" r="13" className="piloto__rosca" />
        <circle
          cx="20"
          cy="20"
          r="10"
          className={`piloto__lente ${encendida ? `piloto__lente--on piloto__lente--${color}` : ''}`}
        />
        <path d="M14 15a9 9 0 0 1 6-3" className="piloto__reflejo" />
      </svg>
      <span className="serigrafia piloto__etiqueta">
        {etiqueta}
        <span className="oculto-visual">{encendida ? ' — encendida' : ' — apagada'}</span>
      </span>
    </div>
  );
}

/** Bornera del pie del tablero. Tornillos ranurados, numeración correlativa. */
export function Bornera({ desde = 1, cantidad = 24 }: { desde?: number; cantidad?: number }) {
  const paso = 26;
  const ancho = cantidad * paso;
  return (
    <svg
      className="bornera"
      viewBox={`0 0 ${ancho} 44`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect x="0" y="6" width={ancho} height="32" className="bornera__riel" />
      {Array.from({ length: cantidad }, (_, i) => {
        const x = i * paso;
        return (
          <g key={i}>
            <rect x={x + 2} y="8" width={paso - 4} height="28" className="bornera__borne" />
            <circle cx={x + paso / 2} cy="18" r="5" className="bornera__tornillo" />
            <line
              x1={x + paso / 2 - 3.5}
              y1="18"
              x2={x + paso / 2 + 3.5}
              y2="18"
              className="bornera__ranura"
            />
            <text x={x + paso / 2} y="33" className="bornera__num">
              {desde + i}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Persianas de ventilación del gabinete. */
export function Persianas({ filas = 7 }: { filas?: number }) {
  return (
    <svg className="persianas" viewBox={`0 0 100 ${filas * 7}`} preserveAspectRatio="none" aria-hidden="true">
      {Array.from({ length: filas }, (_, i) => (
        <line key={i} x1="0" y1={i * 7 + 3.5} x2="100" y2={i * 7 + 3.5} className="persianas__hoja" />
      ))}
    </svg>
  );
}

/** Posición reportada de un interruptor. Sin enlace no se deduce: se declara. */
export type Posicion = 'cerrado' | 'abierto' | 'desconocido';

/** Una derivación del sinóptico: generador, interruptor y su tramo de línea. */
function Rama({
  y,
  rotulo,
  posicion,
}: {
  y: number;
  rotulo: string;
  posicion: Posicion;
}) {
  const cerrado = posicion === 'cerrado';
  const vivo = cerrado ? ' sinoptico__linea--viva' : '';
  return (
    <>
      <circle cx="30" cy={y} r="16" className={`sinoptico__gen${cerrado ? ' sinoptico__gen--vivo' : ''}`} />
      <text x="30" y={y + 5} className="sinoptico__rotulo">
        {rotulo}
      </text>
      <line x1="46" y1={y} x2="108" y2={y} className={`sinoptico__linea${vivo}`} />
      <line
        x1={cerrado ? 118 : 126}
        y1={y}
        x2="196"
        y2={y}
        className={`sinoptico__linea${vivo}`}
      />
      {/* El contacto es la única parte que se mueve: cerrado va derecho,
          abierto se separa en ángulo, desconocido se raya. */}
      <line
        x1="108"
        y1={y}
        x2={cerrado ? 118 : 126}
        y2={cerrado ? y : y - 18}
        className={
          'sinoptico__contacto' +
          (cerrado ? ' sinoptico__contacto--cerrado' : '') +
          (posicion === 'desconocido' ? ' sinoptico__contacto--incierto' : '')
        }
      />
      <line
        x1="113"
        y1={y - 8}
        x2="113"
        y2={y + 8}
        className={`sinoptico__cruz${cerrado ? ' sinoptico__cruz--viva' : ''}`}
      />
    </>
  );
}

/**
 * Esquema sinóptico del frente: los dos generadores, sus interruptores y la
 * barra. Es la pieza que un tablero de buque lleva serigrafiada sobre la chapa
 * para que se vea de un vistazo qué está en barra.
 */
export function Sinoptico({
  tension,
  g1 = 'cerrado',
  g2 = 'abierto',
  puerto = 'abierto',
  barraViva = true,
}: {
  tension: string;
  g1?: Posicion;
  g2?: Posicion;
  /** Toma de puerto. Sólo se dibuja el ramal cuando el tablero la tiene tomada. */
  puerto?: Posicion;
  barraViva?: boolean;
}) {
  /* Una colectora con tensión que no entra de ningún lado es un error de
     plano. Cuando el buque está alimentado de tierra, la acometida se dibuja. */
  const conPuerto = puerto === 'cerrado';
  const fondo = conPuerto ? 196 : 132;
  const tap = conPuerto ? 130 : 66;
  const pie = conPuerto ? 162 : 98;

  const enBarra = conPuerto
    ? 'alimentado desde la toma de puerto'
    : g1 === 'cerrado' && g2 === 'cerrado'
      ? 'G1 y G2 en barra'
      : g1 === 'cerrado'
        ? 'G1 en barra, G2 fuera'
        : g2 === 'cerrado'
          ? 'G2 en barra, G1 fuera'
          : 'ningún generador en barra';

  return (
    <svg
      className="sinoptico"
      viewBox={`0 0 340 ${fondo}`}
      role="img"
      aria-label={`Esquema: ${enBarra}. Barra a ${tension}`}
    >
      <Rama y={34} rotulo="G1" posicion={g1} />
      <Rama y={98} rotulo="G2" posicion={g2} />
      {conPuerto && <Rama y={162} rotulo="TP" posicion={puerto} />}

      {/* Colector y barra */}
      <line
        x1="196"
        y1="34"
        x2="196"
        y2={pie}
        className={`sinoptico__linea${barraViva ? ' sinoptico__linea--viva' : ''}`}
      />
      {/* Una barra que nadie reportó no se dibuja con tensión. */}
      <line
        x1="196"
        y1={tap}
        x2="326"
        y2={tap}
        className={`sinoptico__barra${barraViva ? '' : ' sinoptico__barra--muerta'}`}
      />
      <text x="326" y={tap - 10} className="sinoptico__barra-rotulo">BARRA</text>
      <text x="326" y={tap + 20} className="sinoptico__barra-valor cifra">{tension}</text>
    </svg>
  );
}

/**
 * Símbolo IEC de interruptor automático. Lo comparten el unifilar de la landing
 * y el bloque de maniobra del tablero: una sola pieza, tres posiciones.
 */
export function SimboloQ({ estado = 'abierto' }: { estado?: Posicion }) {
  const cerrado = estado === 'cerrado';
  return (
    <svg className="simbolo-q" viewBox="0 0 28 44" aria-hidden="true">
      <line x1="14" y1="0" x2="14" y2="12" className="simbolo-q__linea" />
      <line
        x1="14"
        y1="12"
        x2={cerrado ? 14 : 24}
        y2="30"
        className={
          'simbolo-q__contacto' + (estado === 'desconocido' ? ' simbolo-q__contacto--incierto' : '')
        }
      />
      <line x1="14" y1="32" x2="14" y2="44" className="simbolo-q__linea" />
      <line x1="8" y1="12" x2="20" y2="12" className="simbolo-q__cruz" />
      <line x1={cerrado ? 17 : 19} y1="20" x2={cerrado ? 25 : 27} y2="16" className="simbolo-q__cruz" />
    </svg>
  );
}

/**
 * La pluma del registrador. Se apoya en el papel donde está el valor de ahora;
 * cuando el enlace se corta, se levanta y queda estacionada sin tinta.
 */
export function Pluma({ apagada = false }: { apagada?: boolean }) {
  return (
    <svg
      className={`pluma-nib${apagada ? ' pluma-nib--apagada' : ''}`}
      viewBox="0 0 14 16"
      aria-hidden="true"
    >
      <path d="M0 2.5 L0 13.5 L13 8 Z" className="pluma-nib__punta" />
    </svg>
  );
}

/** Cabeza de tornillo ranurado. Una chapa se atornilla; no flota. */
export function Tornillo() {
  return (
    <svg className="tornillo" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6" className="tornillo__cabeza" />
      <line x1="4.4" y1="8" x2="11.6" y2="8" className="tornillo__ranura" />
    </svg>
  );
}

/** Chapa grabada y atornillada: identificación del equipo, como la del gabinete. */
export function Chapa({
  buque,
  equipo,
  linea,
}: {
  buque: string;
  equipo: string;
  linea: string;
}) {
  return (
    <div className="chapa">
      <Tornillo />
      <Tornillo />
      <Tornillo />
      <Tornillo />
      <span className="chapa__equipo serigrafia">{equipo}</span>
      <strong className="chapa__buque">
        BP <span className="chapa__nombre">&ldquo;{buque}&rdquo;</span>
      </strong>
      <span className="chapa__linea cifra">{linea}</span>
    </div>
  );
}

/**
 * Pulsador iluminado con bisel roscado sobre chapa grabada.
 *
 * Es la única acción de la página, así que se construye con el vocabulario del
 * tablero y no como un botón de formulario: bisel concéntrico, lente encendida,
 * designación de circuito serigrafiada y carrera real al apretarlo.
 */
/**
 * Símbolo grabado de acceso: la línea que entra al marco.
 *
 * Va en la chapa y no en la lente porque en el riel la lente mide 14 px y
 * cualquier dibujo ahí adentro deja de leerse. Toma el color del rótulo, así
 * que es parte de la leyenda grabada y no una segunda señal naranja.
 */
export function SimboloEntrar() {
  return (
    <svg className="simbolo-entrar" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M9.5 2.5 H13.5 V13.5 H9.5" />
      <path d="M2 8 H9.5" />
      <path d="M6.6 5.1 L9.5 8 L6.6 10.9" />
    </svg>
  );
}

export function Interruptor({
  children,
  designacion,
  href,
  type,
  disabled,
  onClick,
  icono,
  className = '',
}: {
  children: React.ReactNode;
  designacion: string;
  href?: string;
  type?: 'submit' | 'button';
  disabled?: boolean;
  onClick?: () => void;
  /** Símbolo grabado a la izquierda del rótulo, en la chapa. */
  icono?: React.ReactNode;
  className?: string;
}) {
  const dentro = (
    <>
      <span className="interruptor__bisel" aria-hidden="true">
        <span className="interruptor__rosca" />
        <span className="interruptor__lente" />
      </span>
      <span className="interruptor__chapa">
        <span className="interruptor__designacion serigrafia">{designacion}</span>
        <span className="interruptor__rotulo">
          {icono}
          {children}
        </span>
      </span>
    </>
  );

  if (href) {
    return (
      <a className={`interruptor ${className}`} href={href}>
        {dentro}
      </a>
    );
  }
  return (
    <button
      className={`interruptor ${className}`}
      type={type ?? 'button'}
      disabled={disabled}
      onClick={onClick}
    >
      {dentro}
    </button>
  );
}

/**
 * Símbolo grabado del frente de tablero: la puerta, su moldura, el instrumento
 * y las lecturas al costado.
 *
 * El resumen se dibuja como lo que es —el frente entero de un vistazo— y no
 * como una casa, que en una sala de máquinas no significa nada. Toma el color
 * del rótulo: es serigrafía sobre la chapa, no una segunda señal naranja.
 */
export function SimboloFrente() {
  return (
    <svg className="simbolo-frente" viewBox="0 0 24 24" aria-hidden="true">
      {/* la puerta y su moldura */}
      <path d="M2.8 3.8 H21.2 V20.2 H2.8 Z" />
      <path d="M2.8 7.6 H21.2" />
      {/* el instrumento, con la aguja fuera del cero */}
      <circle cx="8.6" cy="14.2" r="3.4" />
      <path d="M8.6 14.2 L10.7 11.9" />
      {/* las lecturas */}
      <path d="M14.4 11.6 H19" />
      <path d="M14.4 14.4 H19" />
      <path d="M14.4 17.2 H17.2" />
    </svg>
  );
}

/**
 * Símbolo grabado de Personal: dos operarios.
 *
 * El personal de la empresa son los administradores y encargados que la operan;
 * el dibujo es la gente, no una tarjeta de identidad. Toma el color del rótulo.
 */
export function SimboloPersonal() {
  return (
    <svg className="simbolo-frente" viewBox="0 0 24 24" aria-hidden="true">
      {/* el de adelante */}
      <circle cx="9" cy="8.2" r="3.2" />
      <path d="M3.5 19.5 C3.5 15.4 5.9 13.6 9 13.6 C12.1 13.6 14.5 15.4 14.5 19.5" />
      {/* el de atrás, corrido */}
      <circle cx="16.6" cy="9.2" r="2.5" />
      <path d="M15.2 14 C18.2 14 20.5 15.6 20.5 19.2" />
    </svg>
  );
}

/**
 * Símbolo grabado de Dispositivos: un microcontrolador con sus patas.
 *
 * Es lo que el producto instala sobre el equipo para que reporte: un integrado
 * con su núcleo y sus pines. No es un engranaje ni una tuerca —eso sería el
 * equipo, no el que lo mide—. Toma el color del rótulo.
 */
export function SimboloDispositivos() {
  return (
    <svg className="simbolo-frente" viewBox="0 0 24 24" aria-hidden="true">
      {/* el cuerpo y el núcleo */}
      <rect x="7" y="7" width="10" height="10" />
      <rect x="10" y="10" width="4" height="4" />
      {/* las patas: dos por lado */}
      <path d="M10 7 V4.4" />
      <path d="M14 7 V4.4" />
      <path d="M10 17 V19.6" />
      <path d="M14 17 V19.6" />
      <path d="M7 10 H4.4" />
      <path d="M7 14 H4.4" />
      <path d="M17 10 H19.6" />
      <path d="M17 14 H19.6" />
    </svg>
  );
}

/**
 * La banda de contexto de una pantalla montada adentro de una empresa.
 *
 * Dice de dónde se entró y qué otras pantallas tiene esa misma empresa. Va
 * arriba del titular y no al pie: quien está adentro de un cliente tiene que
 * ver dónde está antes de leer qué hay.
 *
 * Existe porque el super entra a un cliente desde el padrón de empresas y ahí
 * la botonera del riel no le sirve —le muestra el Resumen y nada más, porque
 * quien cruza el corte está mirando todas las empresas y no una—. Adentro de
 * una, en cambio, sí hay a qué referirse, y es la de la URL.
 */
export function Contexto({
  volver,
  hermanas,
}: {
  volver?: { href: string; rotulo: string };
  hermanas?: { href: string; rotulo: string; actual: boolean }[];
}) {
  if (!volver && !hermanas?.length) return null;

  return (
    <nav className="registro__contexto" aria-label="Dónde estás">
      {volver ? (
        <a className="registro__volver" href={volver.href}>
          <span aria-hidden="true">←</span> {volver.rotulo}
        </a>
      ) : null}
      {hermanas?.map((hermana) => (
        <a
          key={hermana.href}
          className="fila__accion registro__hermana"
          href={hermana.href}
          /* La pantalla en la que ya estás sigue estando: un enlace que
             desaparece deja el juego de mandos incompleto y no se entiende
             entre qué se está eligiendo. `aria-current` la marca sin sacarla. */
          aria-current={hermana.actual ? 'page' : undefined}
        >
          {hermana.rotulo}
        </a>
      ))}
    </nav>
  );
}
