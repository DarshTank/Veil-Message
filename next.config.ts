// import { NextConfig } from 'next';

// /** @type {import('next').NextConfig} */
// const nextConfig: NextConfig = {
//   webpack: (config: any, options: { isServer: any }) => {
//     if (!options.isServer) {
//       config.resolve.fallback = {
//         fs: false,  // Prevents Webpack from bundling 'fs'
//         path: false,
//       };
//     }
//     return config;
//   },

//   eslint: {
//     ignoreDuringBuilds: true,
//   },
// };

// export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["images.unsplash.com", "res.cloudinary.com"],
  },
  // Disable type-checking during builds (not recommended for production)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
