/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost/stylo-api/public/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig

