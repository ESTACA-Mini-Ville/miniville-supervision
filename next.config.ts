import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  // Enable Next.js 16 Cache Components feature
  // This allows the framework to use cached server component rendering
  // where appropriate. Review components that rely on per-request
  // dynamic data (Date, headers(), cookies(), searchParams) and
  // mark them dynamic if needed.
  cacheComponents: true,
  images: {
    qualities: [25],
  },
};

export default nextConfig;
