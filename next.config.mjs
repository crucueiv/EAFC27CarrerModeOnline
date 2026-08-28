/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.ea.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "ratings-images-prod.pulse.ea.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "drop-assets.ea.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "media.api-sports.io",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "v3.football.api-sports.io",
        pathname: "/**"
      }
    ]
  }
};

export default nextConfig;
