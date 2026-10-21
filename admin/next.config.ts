import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The admin and the public site share one domain, and Next requests its chunks from an
  // absolute /_next/... path. Without a basePath both apps ask for /_next/... , the proxy
  // hands those to the public site, and the admin's chunks 404 → blank page.
  // basePath moves the admin's pages AND its assets under /admin/, so the two stop colliding.
  // The proxy must forward /admin/* to this app WITHOUT stripping the prefix.
  basePath: '/admin',

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
