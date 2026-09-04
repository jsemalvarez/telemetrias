import type { MetadataRoute } from 'next';

/**
 * Manifiesto de instalación.
 *
 * `screenshots` no es decorativo: es lo que habilita el diálogo de instalación
 * ancho de Chrome en Android — sin capturas ni descripción, el navegador
 * muestra el cartelito chico y genérico.
 */

/* Next 14 todavía no tipa `form_factor` ni `label`, pero los emite en el JSON y
   Chrome los necesita para elegir la captura según el ancho del dispositivo. */
type Captura = NonNullable<MetadataRoute.Manifest['screenshots']>[number] & {
  form_factor?: 'narrow' | 'wide';
  label?: string;
};

const CAPTURAS: Captura[] = [
  {
    src: '/capturas/tablero-angosto.png',
    sizes: '450x1000',
    type: 'image/png',
    form_factor: 'narrow',
    label: 'Tablero de un equipo con sus lecturas vivas',
  },
  {
    src: '/capturas/inicio-angosto.png',
    sizes: '450x1000',
    type: 'image/png',
    form_factor: 'narrow',
    label: 'Inicio de Monitoreo Tecvol',
  },
  {
    src: '/capturas/tablero-ancho.png',
    sizes: '1280x800',
    type: 'image/png',
    form_factor: 'wide',
    label: 'Tablero de un equipo con sus lecturas vivas',
  },
];

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Monitoreo Tecvol',
    short_name: 'Tecvol',
    description:
      'Monitoreo remoto para equipamiento eléctrico e industrial: tensión, corriente, temperatura y estado, con alarmas antes de la falla.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0e1114',
    theme_color: '#0e1114',
    lang: 'es-AR',
    dir: 'ltr',
    categories: ['business', 'productivity', 'utilities'],
    icons: [
      { src: '/icons/favicon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
      { src: '/icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      /* Archivo aparte para el recorte a círculo: el disco va al 72% del lado
         para que el borde exterior del velocímetro sobreviva la máscara. */
      { src: '/icons/maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
    screenshots: CAPTURAS,
  };
}
