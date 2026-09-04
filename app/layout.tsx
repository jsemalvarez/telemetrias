import type { Metadata, Viewport } from 'next';
import { Sora } from 'next/font/google';
import './globals.css';
import './mundo.css';
import { Instalar } from '@/components/Instalar';

/* Sora es la cara de la marca Tecvol, tomada del sitio existente. */
const sora = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700', '800'],
  display: 'swap',
  variable: '--fuente-sora',
});

export const metadata: Metadata = {
  title: 'Monitoreo Tecvol — que el equipo avise antes de fallar',
  description:
    'Monitoreo remoto para equipamiento eléctrico e industrial. Se instala sobre la instalación que ya tenés y reporta tensión, corriente, temperatura y estado por microcontrolador.',
  metadataBase: new URL('https://tecvol.com.ar'),
  manifest: '/manifest.webmanifest',
  applicationName: 'Monitoreo Tecvol',
  icons: {
    icon: [
      { url: '/icons/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  /* iOS no lee el manifiesto: la app instalada desde Safari se configura acá.
     `black` deja la barra de estado en negro con texto blanco y sin superponer
     el contenido, que es lo que corresponde a una app de fondo oscuro. */
  appleWebApp: {
    capable: true,
    title: 'Tecvol',
    statusBarStyle: 'black',
  },
  openGraph: {
    title: 'Monitoreo Tecvol',
    description:
      'Que el equipo avise antes de fallar. Monitoreo remoto para equipamiento eléctrico e industrial.',
    locale: 'es_AR',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0e1114',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={sora.variable}>
      <body>
        <a className="saltar" href="#contenido">
          Saltar al contenido
        </a>
        {children}
        <Instalar />
      </body>
    </html>
  );
}
