/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: import.meta.dirname,
  // This codebase predates type-checking (Vite's build never ran tsc),
  // so type errors don't block the build.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
