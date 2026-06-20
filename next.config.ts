import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Yahoo Finance API 프록시용 rewrites
  async rewrites() {
    return [
      {
        source: "/api/yahoo/:path*",
        destination: "https://query1.finance.yahoo.com/:path*",
      },
    ];
  },
};

export default nextConfig;
