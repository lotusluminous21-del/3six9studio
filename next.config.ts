import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    FIREBASE_WEBAPP_CONFIG: process.env.FIREBASE_WEBAPP_CONFIG,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: ["framer-motion", "framer-motion-3d", "motion-dom", "motion-utils"],
};

export default nextConfig;
