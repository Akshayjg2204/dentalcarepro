/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.netlify.app']
    }
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['blob.v0.dev'],
    unoptimized: true
  },
  trailingSlash: false,
  output: 'standalone'
}

export default nextConfig
