import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep file tracing inside this application. This prevents an unrelated
  // package-lock.json in a parent Windows directory from becoming Next's root.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
