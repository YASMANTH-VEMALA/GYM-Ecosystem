/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@gymstack/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.mygymapp.in',
      },
    ],
  },
  async rewrites() {
    const apiBaseUrl = (process.env.API_URL || 'http://localhost:4000').replace(/\/api$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
