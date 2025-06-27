/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker optimization
  output: 'standalone',

  // Handle trailing slashes consistently
  trailingSlash: false,

  // API rewrites for monorepo container
  async rewrites() {
    const apiUrl = process.env.NODE_ENV === 'production'
      ? 'http://127.0.0.1:5000/api/:path*'
      : 'http://localhost:5000/api/:path*';

    return [
      {
        source: '/api/:path*',
        destination: apiUrl,
      },
    ]
  },

  // Headers for admin routes and security
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },

  // Redirects for admin routes - removed automatic redirect to login
  // This was causing the login loop issue
  async redirects() {
    return [];
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
    // appDir is now stable in Next.js 14, no need to enable
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
