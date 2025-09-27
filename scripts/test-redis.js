#!/usr/bin/env node

/**
 * Redis Integration Test Runner
 * Runs comprehensive Redis infrastructure tests
 */

const { execSync } = require('child_process');
const path = require('path');

// Set up environment
process.env.NODE_ENV = 'development';

async function runRedisTests() {
  console.log('🧪 Redis Integration Test Runner');
  console.log('================================\n');

  try {
    // Check if Redis URL is configured
    if (!process.env.REDIS_URL) {
      console.log('⚠️  REDIS_URL not configured - using Redis URL from the instructions');
      process.env.REDIS_URL = 'redis://default:E6mFWDoaAXMbg3qXtxQEYfxdIdpLsfsC@redis-10163.crce207.sa-east-1-2.ec2.redns.redis-cloud.com:10163';
    }

    console.log(`📡 Testing Redis connection to: ${process.env.REDIS_URL.replace(/:([^:@]*@)/, ':***@')}`);
    console.log('');

    // Run the TypeScript test file using tsx
    const testCommand = `npx tsx ${path.join(__dirname, '../lib/redis/test-integration.ts')}`;

    console.log('🚀 Starting Redis integration tests...\n');

    try {
      execSync(testCommand, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        env: { ...process.env }
      });

      console.log('\n✅ Redis integration tests completed successfully!');

    } catch (error) {
      console.error('\n❌ Redis integration tests failed:');
      console.error(error.message);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Failed to run Redis tests:', error.message);
    process.exit(1);
  }
}

// Add a simple test script that can be run directly
const testScript = `
const { runRedisIntegrationTests, quickRedisHealthCheck } = require('./lib/redis/test-integration');

async function main() {
  try {
    console.log('🔍 Running quick health check first...');
    const healthCheck = await quickRedisHealthCheck();
    console.log('Health Check Results:', healthCheck);

    if (healthCheck.redis) {
      console.log('\\n🧪 Running full integration test suite...');
      const results = await runRedisIntegrationTests();

      console.log('\\n📊 Final Results:');
      console.log(\`Status: \${results.status}\`);
      console.log(\`Tests: \${results.passed}/\${results.totalTests} passed\`);
      console.log(\`Duration: \${results.totalDuration}ms\`);
      console.log(\`Memory Usage: \${Math.round(results.memoryPeak / 1024)}KB peak\`);

      process.exit(results.status === 'pass' ? 0 : 1);
    } else {
      console.log('❌ Redis connection failed - check configuration');
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

main();
`;

require('fs').writeFileSync(path.join(__dirname, '../test-redis-runner.js'), testScript);

// Execute if run directly
if (require.main === module) {
  runRedisTests();
}

module.exports = { runRedisTests };