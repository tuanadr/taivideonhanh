/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker optimization
  output: 'standalone',
  
  // Disable telemetry for faster builds
  telemetry: false,
  
  // Optimize images
  images: {
    domains: ['i.ytimg.com', 'img.youtube.com'],
    unoptimized: false,
  },
  
  // Experimental features for better performance
  experimental: {
    // Enable SWC minification for faster builds
    swcMinify: true,
    
    // Optimize CSS
    optimizeCss: true,
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimize for production builds
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }
    
    return config;
  },
  
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
