import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
        "/api/reports": ["./src/assets/fonts/**/*"],
    },
};

export default nextConfig;
