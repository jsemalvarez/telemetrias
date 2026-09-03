/* Perfiles de la flota marplatense en línea técnica — el mismo trazo con que se
   dibuja un plano eléctrico. Siete cascos, siete siluetas: en este oficio el
   buque se reconoce por su perfil antes que por su nombre, así que una silueta
   repetida y recoloreada siete veces sería una mentira de dibujo.

   La sala de máquinas es el único volumen con señal, y cuando hay enlace
   muestra el mismo valor que corre en el tablero del plano 1. */

type Caja = { x: number; y: number; w: number; h: number };

type Perfil = {
  tipo: string;
  proa: number;
  popa: number;
  cubierta: number;
  casetas: Caja[];
  puente?: Caja;
  mastil?: { x: number; alto: number };
  portico?: { x: number; w: number; h: number };
  rampa?: boolean;
  tangones?: boolean;
  poteras?: number;
  sala: Caja;
};

const PERFILES: Record<string, Perfil> = {
  /* Fresquero de altura: caseta a media eslora, pórtico y rampa de popa. */
  Luigi: {
    tipo: 'Fresquero de altura',
    proa: 26,
    popa: 396,
    cubierta: 84,
    casetas: [{ x: 150, y: 52, w: 104, h: 32 }],
    puente: { x: 172, y: 36, w: 60, h: 16 },
    mastil: { x: 202, alto: 10 },
    portico: { x: 330, w: 50, h: 30 },
    rampa: true,
    sala: { x: 252, y: 90, w: 66, h: 28 },
  },
  /* Costero: casco corto, caseta bien a popa, palo alto, sin pórtico. */
  Anita: {
    tipo: 'Costero',
    proa: 74,
    popa: 356,
    cubierta: 88,
    casetas: [{ x: 250, y: 54, w: 84, h: 34 }],
    puente: { x: 268, y: 40, w: 48, h: 14 },
    mastil: { x: 292, alto: 4 },
    sala: { x: 176, y: 94, w: 58, h: 24 },
  },
  /* Congelador: eslora larga, superestructura de dos niveles a proa de media. */
  'Maria Eugenia': {
    tipo: 'Congelador',
    proa: 18,
    popa: 412,
    cubierta: 80,
    casetas: [
      { x: 118, y: 48, w: 118, h: 32 },
      { x: 138, y: 30, w: 80, h: 18 },
    ],
    puente: { x: 154, y: 18, w: 50, h: 12 },
    mastil: { x: 179, alto: -4 },
    portico: { x: 344, w: 56, h: 34 },
    rampa: true,
    sala: { x: 248, y: 86, w: 76, h: 30 },
  },
  /* Tangonero: los tangones abatidos son su firma. */
  'Luca Mario': {
    tipo: 'Tangonero',
    proa: 44,
    popa: 380,
    cubierta: 86,
    casetas: [{ x: 232, y: 54, w: 92, h: 32 }],
    puente: { x: 252, y: 40, w: 50, h: 14 },
    mastil: { x: 178, alto: 2 },
    tangones: true,
    sala: { x: 148, y: 92, w: 62, h: 26 },
  },
  /* Potero: la línea de máquinas poteras y sus palos de luces. */
  'Don Francisco': {
    tipo: 'Potero',
    proa: 40,
    popa: 384,
    cubierta: 84,
    casetas: [{ x: 246, y: 50, w: 96, h: 34 }],
    puente: { x: 266, y: 36, w: 54, h: 14 },
    mastil: { x: 293, alto: 2 },
    poteras: 7,
    sala: { x: 160, y: 90, w: 64, h: 28 },
  },
  /* Fresquero clásico: caseta a proa, cubierta de trabajo larga a popa. */
  Domaio: {
    tipo: 'Fresquero',
    proa: 30,
    popa: 388,
    cubierta: 84,
    casetas: [{ x: 76, y: 52, w: 96, h: 32 }],
    puente: { x: 96, y: 38, w: 54, h: 14 },
    mastil: { x: 123, alto: 6 },
    portico: { x: 318, w: 46, h: 26 },
    sala: { x: 196, y: 90, w: 62, h: 28 },
  },
  /* Media altura: caseta central, pórtico bajo, sin rampa. */
  Scirocco: {
    tipo: 'Media altura',
    proa: 48,
    popa: 376,
    cubierta: 86,
    casetas: [{ x: 168, y: 56, w: 88, h: 30 }],
    puente: { x: 186, y: 44, w: 48, h: 12 },
    mastil: { x: 210, alto: 8 },
    portico: { x: 306, w: 44, h: 24 },
    sala: { x: 118, y: 92, w: 58, h: 26 },
  },
};

export function Buque({
  nombre,
  encendido = false,
  alarma = false,
  lectura,
  titulo,
}: {
  nombre: keyof typeof PERFILES | string;
  encendido?: boolean;
  alarma?: boolean;
  /** Valor vivo del tablero, mostrado dentro de la sala de máquinas. */
  lectura?: string;
  titulo?: string;
}) {
  const p = PERFILES[nombre] ?? PERFILES.Luigi;
  const base = p.cubierta + 44;
  const agua = base - 6;

  return (
    <svg
      viewBox="0 0 440 172"
      className={`buque ${encendido ? 'buque--vivo' : ''} ${alarma ? 'buque--alarma' : ''}`}
      role={titulo ? 'img' : 'presentation'}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      <line x1="0" y1={agua} x2="440" y2={agua} className="buque__agua" />

      {/* Casco */}
      <path
        d={`M${p.proa} ${p.cubierta} L${p.popa} ${p.cubierta} L${p.popa - 12} ${base - 12} Q${p.popa - 18} ${base} ${p.popa - 32} ${base} L${p.proa + 30} ${base} Q${p.proa + 12} ${base} ${p.proa + 4} ${base - 16} Z`}
        className="buque__casco"
      />
      <path
        d={`M${p.proa} ${p.cubierta} L${p.proa} ${p.cubierta - 10} L${p.popa} ${p.cubierta - 10} L${p.popa} ${p.cubierta}`}
        className="buque__amurada"
      />

      {/* Superestructura */}
      {p.casetas.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} className="buque__caseta" />
      ))}
      {p.puente && (
        <>
          <rect
            x={p.puente.x}
            y={p.puente.y}
            width={p.puente.w}
            height={p.puente.h}
            className="buque__puente"
          />
          <line
            x1={p.puente.x + 6}
            y1={p.puente.y + p.puente.h / 2}
            x2={p.puente.x + p.puente.w - 6}
            y2={p.puente.y + p.puente.h / 2}
            className="buque__ventana"
          />
        </>
      )}

      {p.mastil && (
        <>
          <line
            x1={p.mastil.x}
            y1={p.puente ? p.puente.y : p.casetas[0].y}
            x2={p.mastil.x}
            y2={p.mastil.alto}
            className="buque__mastil"
          />
          <line
            x1={p.mastil.x}
            y1={p.mastil.alto + 6}
            x2={p.casetas[0].x}
            y2={p.casetas[0].y}
            className="buque__jarcia"
          />
          <line
            x1={p.mastil.x}
            y1={p.mastil.alto + 6}
            x2={p.casetas[0].x + p.casetas[0].w}
            y2={p.casetas[0].y}
            className="buque__jarcia"
          />
        </>
      )}

      {/* Tangones abatidos: la firma del tangonero. */}
      {p.tangones && p.mastil && (
        <>
          <line x1={p.mastil.x} y1={p.mastil.alto + 10} x2={p.proa + 16} y2={p.cubierta - 26} className="buque__tangon" />
          <line x1={p.mastil.x} y1={p.mastil.alto + 10} x2={p.popa - 16} y2={p.cubierta - 26} className="buque__tangon" />
        </>
      )}

      {/* Línea de máquinas poteras sobre la borda. */}
      {p.poteras
        ? Array.from({ length: p.poteras }, (_, i) => {
            const x = p.proa + 26 + i * 22;
            return (
              <g key={i}>
                <line x1={x} y1={p.cubierta - 10} x2={x} y2={p.cubierta - 26} className="buque__potera" />
                <circle cx={x} cy={p.cubierta - 29} r="2.4" className="buque__luz" />
              </g>
            );
          })
        : null}

      {/* Pórtico y rampa de popa */}
      {p.portico && (
        <path
          d={`M${p.portico.x} ${p.cubierta - 10} L${p.portico.x} ${p.cubierta - 10 - p.portico.h} L${p.portico.x + p.portico.w} ${p.cubierta - 10 - p.portico.h} L${p.portico.x + p.portico.w} ${p.cubierta - 10}`}
          className="buque__portico"
        />
      )}
      {p.rampa && (
        <line x1={p.popa} y1={p.cubierta} x2={p.popa + 24} y2={p.cubierta + 20} className="buque__rampa" />
      )}

      {/* Sala de máquinas: el único volumen que reporta. */}
      <rect
        x={p.sala.x}
        y={p.sala.y}
        width={p.sala.w}
        height={p.sala.h}
        className="buque__sala"
      />
      <rect
        x={p.sala.x + 7}
        y={p.sala.y + 6}
        width={10}
        height={p.sala.h - 12}
        className="buque__tablero"
      />
      {lectura ? (
        <text
          x={p.sala.x + 23}
          y={p.sala.y + p.sala.h / 2 + 4}
          className="buque__lectura cifra"
        >
          {lectura}
        </text>
      ) : (
        <>
          <line x1={p.sala.x + 23} y1={p.sala.y + 9} x2={p.sala.x + p.sala.w - 8} y2={p.sala.y + 9} className="buque__senal" />
          <line x1={p.sala.x + 23} y1={p.sala.y + 15} x2={p.sala.x + p.sala.w - 16} y2={p.sala.y + 15} className="buque__senal" />
        </>
      )}
    </svg>
  );
}

export const TIPOS = Object.fromEntries(
  Object.entries(PERFILES).map(([k, v]) => [k, v.tipo]),
) as Record<string, string>;
