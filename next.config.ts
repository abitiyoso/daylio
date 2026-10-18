import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.DAYLIO_BUILD_DIRECTORY || ".next",
  devIndicators: false,
  logging: {
    incomingRequests: {
      ignore: [
        /\/api\/v1\/media\//,
        /\/auth\/(confirm|complete)/,
        /\/api\/v1\/invitations\/[a-f0-9]{64}\/accept/,
      ],
    },
  },
  serverExternalPackages: ["postgres", "@electric-sql/pglite"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
