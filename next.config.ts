import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 상위 폴더의 stray lockfile로 인한 workspace root 오인 방지
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }],
  },
};

export default nextConfig;
