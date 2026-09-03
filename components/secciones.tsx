import { CLIENTES, ALCANCE, CONTACTO, APLICACIONES } from '@/lib/datos';
import { Tornillo, Interruptor, SimboloQ, SimboloEntrar } from './instrumentos';

/**
 * Riel superior del gabinete: la navegación es la moldura del tablero.
 *
 * La variante `minimo` es para las rutas de la aplicación, donde no hay
 * secciones que anclar y la acción de la pantalla vive en la pantalla, no en
 * el riel. Lo que va a la derecha lo decide cada ruta.
 */
export function Riel({
  variante = 'landing',
  derecha,
}: {
  variante?: 'landing' | 'minimo';
  derecha?: React.ReactNode;
}) {
  const enLanding = variante === 'landing';
  return (
    <header className="riel">
      <div className="riel__marco marco">
        <a
          className="marca"
          href={enLanding ? '#contenido' : '/'}
          aria-label="Monitoreo Tecvol — inicio"
        >
          <span className="marca__corchete" aria-hidden="true" />
          <span className="marca__nombre">TECVOL</span>
          <span className="marca__linea serigrafia">Monitoreo</span>
        </a>

        {enLanding && (
          <nav className="riel__nav" aria-label="Secciones">
            <a href="#flota">Flota</a>
            <a href="#alcance">Qué se monitorea</a>
            <a href="#aplicaciones">Aplicaciones</a>
          </nav>
        )}

        {enLanding ? (
          <Interruptor
            href="/login"
            designacion="−S1"
            icono={<SimboloEntrar />}
            className="interruptor--riel"
          >
            Ingresar
          </Interruptor>
        ) : (
          <div className="riel__derecha">{derecha}</div>
        )}
      </div>
    </header>
  );
}

/**
 * Qué se monitorea, dibujado como el unifilar que Tecvol dibuja: una barra
 * colectora vertical y cuatro circuitos derivando de ella, cada uno con su
 * interruptor y su designación.
 */
export function Alcance() {
  return (
    <section className="seccion seccion--alcance" id="alcance" aria-labelledby="alcance-t">
      <div className="marco">
        <div className="unifilar">
          <div className="unifilar__cabeza">
            <h2 id="alcance-t">Se instala sobre el equipo que ya está.</h2>
            <p>
              No hace falta cambiar la instalación. El microcontrolador se monta sobre lo que ya
              hay y lee, circuito por circuito, lo que ese equipo siempre supo de sí mismo.
            </p>
          </div>

          {/* La acometida alimenta la barra: una colectora que no entra de
              ningún lado es un error de plano, no un recurso gráfico. */}
          <div className="unifilar__diagrama">
            <p className="unifilar__alimentador">
              <span className="serigrafia unifilar__origen">−W1 · Barra principal 3×380 V</span>
            </p>

            <ol className="unifilar__circuitos">
              {ALCANCE.map((a, i) => (
                <li className="circuito" key={a.titulo}>
                  <span className="circuito__ramal" aria-hidden="true" />
                  <SimboloQ />
                  <span className="serigrafia circuito__designacion">−Q{i + 1}</span>
                  <h3 className="circuito__titulo">{a.titulo}</h3>
                  <p className="circuito__detalle">{a.detalle}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Alcance de aplicación y prueba real.
 *
 * El monitoreo todavía no está instalado en ningún lado, así que la sección no
 * puede decir "mirá dónde funciona". Dice lo que sí es cierto: el producto se
 * instala sobre equipamiento que ya está trabajando, y el equipo no tiene que
 * ser de Tecvol. El cuadro es el de cargas que toda puerta de tablero lleva por
 * dentro; la última columna declara dónde Tecvol tiene obra ejecutada, así que
 * ninguna fila promete experiencia donde no la hay.
 */
export function Prueba() {
  return (
    <section className="seccion" id="aplicaciones" aria-labelledby="aplicaciones-t">
      <div className="marco">
        <div className="seccion__cabeza seccion__cabeza--der">
          <h2 id="aplicaciones-t">Si tiene algo que medir, se puede monitorear.</h2>
          <p>
            El monitoreo es nuevo y todavía no está instalado en ningún lado. Lo que traemos es el
            oficio: Tecvol calcula, fabrica y monta instalaciones eléctricas desde 2020, y por eso
            sabe dónde se toma cada lectura y qué significa cuando se mueve.
          </p>
        </div>

        <div className="cuadro">
          <div className="cuadro__chapa">
            <span className="serigrafia">Cuadro de aplicaciones</span>
          </div>
          <table className="cuadro__tabla">
            <thead>
              <tr>
                <th scope="col">Aplicación</th>
                <th scope="col">Qué se monitorea</th>
                <th scope="col">Lo que el monitoreo responde</th>
                <th scope="col">Obra de Tecvol</th>
              </tr>
            </thead>
            <tbody>
              {APLICACIONES.map((a) => (
                <tr className="aplicacion" key={a.sector}>
                  <th scope="row" className="aplicacion__sector">
                    {a.sector}
                  </th>
                  <td className="aplicacion__tablero">{a.equipo}</td>
                  <td className="aplicacion__pregunta">{a.pregunta}</td>
                  <td
                    className={`aplicacion__parque${a.ejecutado ? '' : ' aplicacion__parque--sin'}`}
                  >
                    {a.parque}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="confian">
          <h3 className="serigrafia confian__titulo">Confían en Tecvol</h3>
          <ul className="confian__lista">
            {CLIENTES.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Pie() {
  return (
    <footer className="pie">
      <div className="marco pie__marco">
        <div className="pie__bloque">
          <span className="marca__nombre pie__marca">TECVOL</span>
          <p className="pie__oficio">
            Ingeniería eléctrica al servicio de la industria. Construcción de tableros y montajes
            eléctricos navales e industriales, desde 2020.
          </p>
        </div>

        <dl className="pie__datos">
          <div>
            <dt className="serigrafia">Dirección</dt>
            <dd>{CONTACTO.direccion}</dd>
          </div>
          <div>
            <dt className="serigrafia">Teléfono</dt>
            <dd className="cifra">{CONTACTO.telefono}</dd>
          </div>
          <div>
            <dt className="serigrafia">WhatsApp</dt>
            <dd>
              <a href={CONTACTO.whatsappUrl} className="cifra">
                {CONTACTO.whatsapp}
              </a>
            </dd>
          </div>
          <div>
            <dt className="serigrafia">Email</dt>
            <dd>
              <a href={`mailto:${CONTACTO.email}`}>{CONTACTO.email}</a>
            </dd>
          </div>
        </dl>

        <div className="pie__legal">
          <Tornillo />
          <a href={CONTACTO.sitio}>tecvol.com.ar</a>
          <a href={CONTACTO.instagram}>Instagram</a>
          <span className="serigrafia pie__placa">Tecvol · Mar del Plata · Argentina</span>
        </div>
      </div>
    </footer>
  );
}

