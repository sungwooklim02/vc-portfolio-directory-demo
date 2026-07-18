import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/vc-portfolio-directory-demo",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
