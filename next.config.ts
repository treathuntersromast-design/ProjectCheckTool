import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Electron でラップして portable exe を生成するため standalone 出力にする。
  // .next/standalone/server.js が生成され、Electron 側で utilityProcess.fork する。
  output: "standalone",
};

export default nextConfig;
