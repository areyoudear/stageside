/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
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
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co', // Spotify artist images
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co', // Supabase storage (avatars, etc)
      },
      {
        protocol: 'https',
        hostname: '*.theaudiodb.com', // Artist images from TheAudioDB
      },
      {
        protocol: 'https',
        hostname: 'r2.theaudiodb.com', // AudioDB CDN
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org', // Wikipedia images
      },
      {
        protocol: 'https',
        hostname: '*.bandsintown.com', // Bandsintown artist images
      },
      {
        protocol: 'https',
        hostname: '*.mzstatic.com', // iTunes/Apple Music images
      },
    ],
  },
};

export default nextConfig;
