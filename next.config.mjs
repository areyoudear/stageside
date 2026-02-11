/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 's1.ticketm.net',
      },
      {
        protocol: 'https',
        hostname: 'images.universe.com',
      },
      {
        protocol: 'https',
        hostname: '*.ticketmaster.com',
      },
    ],
  },
};

export default nextConfig;
