import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  transpilePackages: ["motion"],
  serverExternalPackages: ["firebase-admin", "@google/genai"],
};

export default nextConfig;
