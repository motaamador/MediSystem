import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow using Leaflet (client-side only maps)
  transpilePackages: ['leaflet'],
};

export default nextConfig;
