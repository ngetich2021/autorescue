import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL("https://res.cloudinary.com/proxy-int/**")],
  },
  // Rescue and Shops merged into one homepage (a provider account is always
  // both) — keep old /shops links and bookmarks working.
  async redirects() {
    return [{ source: "/shops", destination: "/", permanent: true }];
  },
};

export default nextConfig;
