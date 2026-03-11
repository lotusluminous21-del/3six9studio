import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  transpilePackages: ["framer-motion", "framer-motion-3d", "motion-dom", "motion-utils"],
};

export default nextConfig;
