import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack, use Webpack
  experimental: {
    // turbo: false  // Uncomment if needed
  },
};

export default nextConfig;
