import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  transpilePackages: ["motion", "lucide-react"],
  serverExternalPackages: ["firebase-admin", "@google/genai"],
};

export default nextConfig;
