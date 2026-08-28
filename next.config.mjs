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
      }
    ]
  }
};

export default nextConfig;
