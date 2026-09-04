/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "jdm2jtgw-3000.uks1.devtunnels.ms",
        "127.0.0.1:3000",
      ],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.ea.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ratings-images-prod.pulse.ea.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "drop-assets.ea.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.api-sports.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "v3.football.api-sports.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/default-avatar.png",
        destination: "/default-avatar.svg",
      },
    ];
  },
};

export default nextConfig;