'use client';

import { LECTURAS, ETIQUETA_DEMO, type Lectura as TLectura } from '@/lib/datos';
import { useVivo } from '@/lib/vivo';
import { Medidor, Piloto, Bornera, Persianas, Chapa, Tornillo, Sinoptico } from './instrumentos';

/** Lectura digital alojada en su hueco rebajado, con designación de circuito. */
function Lectura({
  lectura,
  valor,
  designacion,
}: {
  lectura: TLectura;
  valor: number;
  designacion: string;
}) {
  return (
    <div className={`lectura ${lectura.estado === 'atencion' ? 'lectura--atencion' : ''}`}>
      <span className="serigrafia lectura__designacion">{designacion}</span>
      <span className="serigrafia lectura__etiqueta">{lectura.etiqueta}</span>
      <span className="lectura__valor cifra">
        {valor.toFixed(lectura.decimales)}
        {lectura.unidad && <span className="lectura__unidad">{lectura.unidad}</span>}
      </span>
    </div>
  );
}

const DESIGNACION: Record<string, string> = {
  f: '−P4',
  i2: '−P5',
  i3: '−P6',
  cos: '−P7',
  hs: '−P8',
};

export function Tablero() {
  const { valores, por } = useVivo();

  const tension = por('u12');
  const corriente = por('i1');
  const temp = por('tb');
  const digitales = LECTURAS.filter((l) => !['u12', 'i1', 'tb'].includes(l.id));

  return (
    <div className="tablero" aria-label="Frente de tablero principal">
      <div className="tablero__gabinete">
        {/* Sección de puerta: chapa lisa. Es donde apoya la serigrafía del relato. */}
        <div className="tablero__puerta" aria-hidden="true">
          <div className="tablero__persianas">
            <Persianas filas={9} />
          </div>
          <span className="tablero__legenda serigrafia">
            Tecvol · Mar del Plata · IP 44 · 3×380 V 50 Hz
          </span>
          <div className="tablero__bisagras">
            <span />
            <span />
            <span />
          </div>
          <div className="tablero__tornillos">
            <Tornillo />
            <Tornillo />
          </div>
        </div>

        <div className="tablero__instrumentos">
          <div className="tablero__agujas">
            <div className="hueco hueco--aguja">
              <span className="serigrafia hueco__designacion">−P1</span>
              <Medidor
                valor={tension.valor}
                min={340}
                max={420}
                etiqueta="Tensión de barra"
                unidad="V"
              />
            </div>
            <div className="hueco hueco--aguja">
              <span className="serigrafia hueco__designacion">−P2</span>
              <Medidor valor={corriente.valor} min={0} max={400} etiqueta="Corriente L1" unidad="A" />
            </div>
            <div className="hueco hueco--aguja">
              <span className="serigrafia hueco__designacion">−P3</span>
              <Medidor
                valor={temp.valor}
                min={20}
                max={120}
                etiqueta="Temp. bobinado G1"
                unidad="°C"
                atencion
              />
            </div>
          </div>

          <div className="hueco tablero__pilotos" role="group" aria-label="Señalización">
            <span className="serigrafia hueco__designacion">−H1…H4</span>
            <Piloto encendida etiqueta="G1 en barra" />
            <Piloto encendida={false} etiqueta="G2 en barra" />
            <Piloto encendida color="alarma" etiqueta="Temp. alta" />
            <Piloto encendida={false} etiqueta="Falla a tierra" />
          </div>

          <dl className="tablero__digitales">
            {digitales.map((l) => {
              const i = LECTURAS.findIndex((x) => x.id === l.id);
              return (
                <Lectura
                  key={l.id}
                  lectura={l}
                  valor={valores[i]}
                  designacion={DESIGNACION[l.id] ?? '−P'}
                />
              );
            })}
          </dl>

          <div className="hueco tablero__sinoptico">
            <span className="serigrafia hueco__designacion">−W1</span>
            <Sinoptico tension={`${tension.valor.toFixed(0)} V`} />
          </div>

          <div className="tablero__pie">
            <Chapa
              buque="Luigi"
              equipo="Tablero principal · 3×380 V"
              linea="38°12′S 57°33′W · 214 mn de Mar del Plata"
            />
            <p className="tablero__demo serigrafia">{ETIQUETA_DEMO}</p>
          </div>
        </div>

        <div className="tablero__bornera">
          <span className="serigrafia tablero__bornera-designacion">−X1</span>
          <Bornera cantidad={34} />
        </div>
      </div>
    </div>
  );
}
