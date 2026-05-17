import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@bloghub/api", "@bloghub/db", "@bloghub/types"],
  // Hide the floating Next.js dev tools indicator. Its drag handle can leave
  // the page in a "grabbing" state that disables text selection and shows a
  // round cursor over the whole viewport.
  devIndicators: false,
  async headers() {
    return [
      {
        // Allow the Expo web preview (and any local client) to call the API.
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PATCH,DELETE,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
