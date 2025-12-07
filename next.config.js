/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Tell webpack to ignore Node.js modules that aren't available in browser
      // We set buffer to false since we're not using Supabase Storage
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        buffer: false, // Ignore buffer - we don't use Supabase Storage
      };
    }
    return config;
  },
};

module.exports = nextConfig;
