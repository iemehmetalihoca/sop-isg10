import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Production build creates a fully static package in the /out directory.
  // The output can be hosted by IIS or another standard static web server.
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },

  devIndicators: false,

  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
