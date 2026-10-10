import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // This app is entirely per-request/dynamic (tenant-scoped DB reads, session
  // cookies) — Cache Components' static-by-default model fights that, so it's
  // disabled rather than annotating every single route.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
