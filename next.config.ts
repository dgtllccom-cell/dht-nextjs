import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // typedRoutes moved out of `experimental` in newer Next.js versions.
  typedRoutes: true,
  experimental: {
    // Reduces initial memory footprint in dev by avoiding eager preloading of every route entrypoint.
    // This can help prevent dev server restarts caused by high memory usage.
    preloadEntriesOnStart: false,
    // Lower-risk Webpack behavior change (Next.js v15+) that reduces peak memory usage in builds/dev.
    webpackMemoryOptimizations: true,
  },
  webpack: (config, { dev }) => {
    // OneDrive / Windows file locking can cause EPERM rename failures inside `.next/cache/webpack/*pack.gz`.
    // Use in-memory caching during development to avoid filesystem cache writes/renames.
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  },
};

export default nextConfig;

// Trigger dev server restart to clear in-memory Webpack caching: 2026-06-14T16:23:00
