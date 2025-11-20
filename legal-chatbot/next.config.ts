import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove 'standalone' for Vercel deployment (Vercel doesn't need it)
  // output: 'standalone', // Uncomment if deploying to Docker/Railway
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  images: {
    domains: ['localhost'],
    // Add your Supabase project domain if using Supabase Storage for images
    // remotePatterns: [
    //   {
    //     protocol: 'https',
    //     hostname: '**.supabase.co',
    //   },
    // ],
  },
};

export default nextConfig;
