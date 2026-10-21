import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.desss-portfolio.com' },
      { protocol: 'https', hostname: '**.desss.com' },
    ],
  },
}

export default nextConfig
