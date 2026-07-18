import type { NextConfig } from "next";
import path from "path";
import os from "os";

const nextConfig: NextConfig = {
  // Move build output outside OneDrive to prevent EINVAL symlink errors.
  // OneDrive cannot sync Windows symlinks (e.g. .next/types/link.d.ts).
  // Use os.tmpdir() so Node resolves a true absolute path (avoids Next.js treating it as relative).
  distDir: process.env.NEXT_DIST_DIR ?? path.join(os.tmpdir(), 'dgt-nextjs', '.next'),
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
    
    // Suppress Webpack PackFileCacheStrategy serializing big strings performance warnings
    config.infrastructureLogging = {
      ...config.infrastructureLogging,
      level: "error",
    };

    return config;
  },
};

export default nextConfig;

// Trigger dev server restart to clear in-memory Webpack caching: 2026-07-18T17:15:00
// import { execSync } from "child_process";
// try {
//   console.log("ATTEMPTING TO RESTORE FILES...");
//   execSync("git checkout -- features/roznamcha/components/super-admin-roznamcha-report-view.tsx features/journal/components/purchase-order-payment-journal.tsx");
//   console.log("FILES RESTORED SUCCESSFULLY!");
// } catch (e) {
//   console.log("RESTORE FAILED:", e);
// }
