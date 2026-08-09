import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Server Actions default to a 1MB request body limit. The admin
    // recommended-music upload (/admin/music) submits audio files up to
    // 20MB via a Server Action, so the limit must be raised to match the
    // application-level validation in src/lib/media-validation.ts.
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
