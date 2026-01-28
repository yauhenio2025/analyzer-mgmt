/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Enable standalone output for Docker deployment
  output: 'standalone',
  // Configure API rewrites for development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.API_URL || 'http://localhost:8002/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
