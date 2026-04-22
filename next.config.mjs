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
};

export default nextConfig;
