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
    const configuredApiUrl = (process.env.API_URL || '').replace(/\/api$/, '');
    const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

    let apiBaseUrl = configuredApiUrl;
    if (!apiBaseUrl || (isProduction && (apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1')))) {
      apiBaseUrl = isProduction ? 'https://gym-ecosystem-api.vercel.app' : 'http://localhost:4000';
    }

    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
