'use client';

import { useRef, useState } from 'react';
import { CONTACTO } from '@/lib/datos';
import { Interruptor, Bornera } from './instrumentos';

type Campo = 'nombre' | 'empresa' | 'buques' | 'contacto';
type Errores = Partial<Record<Campo, string>>;

const CAMPOS: {
  id: Campo;
  etiqueta: string;
  ayuda: string;
  designacion: string;
  ancho?: boolean;
}[] = [
  {
    id: 'nombre',
    etiqueta: 'Nombre y apellido',
    ayuda: 'Quién va a ver la demo.',
    designacion: '−X2:1',
  },
  {
    id: 'empresa',
    etiqueta: 'Empresa o armador',
    ayuda: 'A nombre de quién está la flota.',
    designacion: '−X2:2',
  },
  {
    id: 'buques',
    etiqueta: 'Buques a monitorear',
    ayuda: 'Nombre y, si lo tenés a mano, qué tablero lleva cada uno.',
    designacion: '−X2:3',
    ancho: true,
  },
  {
    id: 'contacto',
    etiqueta: 'WhatsApp o email',
    ayuda: 'Por dónde te contestamos.',
    designacion: '−X2:4',
  },
];

/**
 * La solicitud se cursa por el canal que Tecvol ya usa: WhatsApp, con el
 * mensaje armado. Cuando exista backend, este submit pasa a ser un POST y el
 * resto del componente no cambia.
 */
export function Demo() {
  const [valores, setValores] = useState<Record<Campo, string>>({
    nombre: '',
    empresa: '',
    buques: '',
    contacto: '',
  });
  const [errores, setErrores] = useState<Errores>({});
  const [estado, setEstado] = useState<'listo' | 'enviando' | 'enviado'>('listo');
  const resumen = useRef<HTMLDivElement>(null);

  const validar = (v: Record<Campo, string>): Errores => {
    const e: Errores = {};
    if (!v.nombre.trim()) e.nombre = 'Falta el nombre.';
    if (!v.empresa.trim()) e.empresa = 'Falta la empresa o el armador.';
    if (!v.buques.trim()) e.buques = 'Decinos al menos un buque.';
    if (!v.contacto.trim()) e.contacto = 'Falta un WhatsApp o un email.';
    else if (!/@/.test(v.contacto) && !/\d{6,}/.test(v.contacto))
      e.contacto = 'Poné un email válido o un número con característica.';
    return e;
  };

  const enviar = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validar(valores);
    setErrores(e);
    if (Object.keys(e).length) {
      resumen.current?.focus();
      return;
    }

    setEstado('enviando');
    const texto = [
      'Hola Tecvol, quiero una demo del monitoreo.',
      `Nombre: ${valores.nombre}`,
      `Empresa: ${valores.empresa}`,
      `Buques: ${valores.buques}`,
      `Contacto: ${valores.contacto}`,
    ].join('\n');

    window.setTimeout(() => {
      window.open(`${CONTACTO.whatsappUrl}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
      setEstado('enviado');
    }, 450);
  };

  const cambiar = (id: Campo, valor: string) => {
    setValores((v) => ({ ...v, [id]: valor }));
    if (errores[id]) setErrores((e) => ({ ...e, [id]: undefined }));
  };

  const listaErrores = (Object.keys(errores) as Campo[]).filter((k) => errores[k]);

  return (
    <section className="seccion seccion--demo" id="demo" aria-labelledby="demo-t">
      <div className="marco demo">
        <div className="demo__texto">
          <h2 id="demo-t">Pedí la demo con tu propio buque.</h2>
          <p>
            No mostramos una cuenta de ejemplo. Tomamos un buque tuyo, vemos qué tablero lleva y te
            mostramos qué se puede leer de ese equipo en particular.
          </p>
          <p className="demo__alterna">
            Si preferís escribir directo:{' '}
            <a href={CONTACTO.whatsappUrl}>{CONTACTO.whatsapp}</a> o{' '}
            <a href={`mailto:${CONTACTO.email}`}>{CONTACTO.email}</a>.
          </p>
        </div>

        <form className="formulario" onSubmit={enviar} noValidate>
          <div className="formulario__chapa">
            <span className="serigrafia">−X2 · Solicitud de demostración</span>
          </div>

          {listaErrores.length > 0 && (
            <div className="aviso aviso--error" role="alert" tabIndex={-1} ref={resumen}>
              <strong>Faltan datos para poder contestarte:</strong>
              <ul>
                {listaErrores.map((k) => (
                  <li key={k}>{errores[k]}</li>
                ))}
              </ul>
            </div>
          )}

          {estado === 'enviado' && (
            <div className="aviso aviso--ok" role="status">
              <strong>Listo.</strong> Te abrimos WhatsApp con el mensaje armado. Si no se abrió,
              escribinos a <a href={CONTACTO.whatsappUrl}>{CONTACTO.whatsapp}</a>.
            </div>
          )}

          <div className="formulario__campos">
            {CAMPOS.map((c) => {
              const malo = Boolean(errores[c.id]);
              return (
                <p className={`campo ${c.ancho ? 'campo--ancho' : ''}`} key={c.id}>
                  <span className="campo__cabeza">
                    <label className="campo__etiqueta" htmlFor={c.id}>
                      {c.etiqueta}
                    </label>
                    <span className="serigrafia campo__designacion" aria-hidden="true">
                      {c.designacion}
                    </span>
                  </span>
                  <span className="hueco hueco--campo">
                    <input
                      id={c.id}
                      name={c.id}
                      type="text"
                      className="campo__entrada"
                      value={valores[c.id]}
                      onChange={(e) => cambiar(c.id, e.target.value)}
                      aria-invalid={malo || undefined}
                      aria-describedby={`${c.id}-ayuda`}
                      autoComplete={
                        c.id === 'nombre' ? 'name' : c.id === 'empresa' ? 'organization' : 'off'
                      }
                    />
                  </span>
                  <span className="campo__ayuda" id={`${c.id}-ayuda`}>
                    {malo ? errores[c.id] : c.ayuda}
                  </span>
                </p>
              );
            })}
          </div>

          <div className="formulario__mando">
            <Interruptor type="submit" designacion="−S2" disabled={estado === 'enviando'}>
              {estado === 'enviando' ? 'Armando el mensaje…' : 'Pedir demo'}
            </Interruptor>
          </div>

          <div className="formulario__bornera" aria-hidden="true">
            <Bornera cantidad={20} />
          </div>
        </form>
      </div>
    </section>
  );
}
