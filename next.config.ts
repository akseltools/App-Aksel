/**
 * next.config.ts
 * Next.js configuration for Aksel Tools.
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable strict mode for better error catching in development
  reactStrictMode: true,

  // Allow images from any source (logo is local, but future product images may be remote)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },

  // Experimental features
  experimental: {
    // Enables server actions (stable in Next.js 14+)
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
