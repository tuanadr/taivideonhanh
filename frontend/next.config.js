/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker optimization
  output: 'standalone',

  // Handle trailing slashes consistently (false for better Traefik compatibility)
  trailingSlash: false,

  // API rewrites for monorepo container
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
      // Admin routes - ensure they're handled by Next.js
      {
        source: '/admin/:path*',
        destination: '/admin/:path*',
      },
    ]
  },

  // Headers for better compatibility and security
  async headers() {
    return [
      // Admin routes headers
      {
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },

  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
    unoptimized: false,
  },

  // Experimental features for better performance
  experimental: {
    // Enable app directory for admin routes
    appDir: true,
    // Optimize CSS - disabled due to critters issue
    // optimizeCss: true,
  },
  
  // Webpack optimizations - temporarily disabled due to build issues
  // webpack: (config, { dev, isServer }) => {
  //   // Optimize for production builds
  //   if (!dev) {
  //     config.optimization = {
  //       ...config.optimization,
  //       splitChunks: {
  //         chunks: 'all',
  //         cacheGroups: {
  //           vendor: {
  //             test: /[\\/]node_modules[\\/]/,
  //             name: 'vendors',
  //             chunks: 'all',
  //           },
  //         },
  //       },
  //     };
  //   }
  //
  //   return config;
  // },
  
  // Reduce bundle size
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

module.exports = nextConfig;
