import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    // No bloquear el deploy en Vercel por errores/warnings de lint.
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['pdf-parse'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    }
    return config
  },
}

export default nextConfig
