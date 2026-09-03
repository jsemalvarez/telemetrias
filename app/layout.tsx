import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import './globals.css';
import './mundo.css';

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
  openGraph: {
    title: 'Monitoreo Tecvol',
    description:
      'Que el equipo avise antes de fallar. Monitoreo remoto para equipamiento eléctrico e industrial.',
    locale: 'es_AR',
    type: 'website',
  },
};

export const viewport = {
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
      </body>
    </html>
  );
}
