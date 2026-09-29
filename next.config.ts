import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  transpilePackages: ["motion"],
  serverExternalPackages: ["firebase-admin", "@google/genai"],
};

export default nextConfig;
