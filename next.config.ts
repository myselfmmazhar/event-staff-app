import type { NextConfig } from "next";
// Restarting to pick up Prisma changes - 2026-02-24T14:42:00Z

const nextConfig: NextConfig = {
  reactStrictMode: false,
  turbopack: {},
  serverExternalPackages: ['jspdf', 'fflate', 'pg', 'pg-pool', 'pgpass', '@prisma/adapter-pg'],
  // Webpack configuration for Mapbox GL compatibility
  webpack: (config) => {
    // Mapbox GL requires these settings
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];

    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });

    return config;
  },
};

export default nextConfig;
