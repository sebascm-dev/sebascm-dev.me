import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // viewTransition ya no es experimental desde Next 16.3: funciona sin configuracion
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  images: {
    remotePatterns: [
      {
        // Las imágenes se sirven por /api/images, en el propio dominio — evita las IPs
        // anycast de Cloudflare bloqueadas en España (ver R2_PUBLIC_URL)
        protocol: 'https',
        hostname: 'sebascm.me',
      },
      {
        protocol: 'https',
        hostname: 'www.sebascm.me',
      },
      {
        // Dominios viejos — se mantienen por si queda alguna URL sin migrar
        protocol: 'https',
        hostname: 'cdn.sebascm.me',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
    ],
  },
};

export default nextConfig;
