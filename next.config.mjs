import withPWAInit from '@ducanh2912/next-pwa';

/* El service worker se genera en build. En desarrollo queda apagado: un SW
   cacheando sobre HMR devuelve pantallas viejas y hace perder horas. */
const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withPWA(nextConfig);
