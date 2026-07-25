import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 상위 폴더의 stray lockfile로 인한 workspace root 오인 방지
  turbopack: {
    root: path.resolve(__dirname),
  },
  // pdf-parse(내부 pdf.js)는 서버에서만 쓰는 무거운 패키지 — 번들 대신 런타임 require 로 처리
  serverExternalPackages: ["pdf-parse"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }],
  },
};

export default nextConfig;
