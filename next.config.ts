import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  transpilePackages: ["motion"],
  serverExternalPackages: ["firebase-admin", "@google/genai"],
};

export default nextConfig;
