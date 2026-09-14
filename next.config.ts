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
        protocol: 'https',
        hostname: '*.r2.dev',
      },
    ],
  },
};

export default nextConfig;
