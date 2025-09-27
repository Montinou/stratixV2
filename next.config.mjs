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
  // Force dynamic rendering for Stack Auth compatibility - using memory token store
  // Environment validation at build time
  webpack: (config, { isServer }) => {
    // Only validate on server-side builds to avoid duplication
    if (isServer) {
      // Simple environment validation without dynamic imports
      const requiredVars = [
        'DATABASE_URL',
        'DATABASE_URL_UNPOOLED', 
        'NEON_PROJECT_ID',
        'NEXT_PUBLIC_STACK_PROJECT_ID',
        'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY',
        'STACK_SECRET_SERVER_KEY'
      ]
      
      const missingVars = requiredVars.filter(varName => !process.env[varName])
      
      if (missingVars.length > 0) {
        console.error('❌ Missing required environment variables:')
        missingVars.forEach(varName => console.error(`  - ${varName}`))
        console.error('\nPlease check your .env.local file and ensure all required variables are set.')
        console.error('See .env.example for the complete list of required variables.')
        throw new Error('Environment validation failed')
      } else {
        console.log('✅ Environment validation passed')
      }
    }
    return config
  },
}

export default nextConfig