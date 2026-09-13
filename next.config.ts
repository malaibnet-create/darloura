import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep file tracing inside this application. This prevents an unrelated
  // package-lock.json in a parent Windows directory from becoming Next's root.
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/placement-test/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'microphone=(self)' },
        ],
      },
    ];
  },
};

export default nextConfig;
