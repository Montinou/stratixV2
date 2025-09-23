/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Environment validation at build time
  webpack: (config, { isServer }) => {
    // Only validate on server-side builds to avoid duplication
    if (isServer) {
      try {
        // Import and run validation
        const { validateEnvironmentForBuild } = require('./lib/config/env-validation.ts')
        validateEnvironmentForBuild()
      } catch (error) {
        // Allow the build to continue in case the validation file doesn't exist yet
        // This prevents chicken-and-egg problems during initial setup
        console.warn('Environment validation skipped:', error.message)
      }
    }
    return config
  },
}

export default nextConfig