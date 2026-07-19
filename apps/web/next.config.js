/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Transpile shared packages from the monorepo
  transpilePackages: ['@ethiobankshub/shared'],

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1',
    NEXT_PUBLIC_APP_NAME: process.env['NEXT_PUBLIC_APP_NAME'] ?? 'EthioBanksHub',
    NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000',
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
