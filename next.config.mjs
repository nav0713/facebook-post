/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow external images from any hostname for featured article images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  // Prevent webpack from bundling better-sqlite3 native addon
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals ?? []), "better-sqlite3"];
    }
    return config;
  },
};

export default nextConfig;
