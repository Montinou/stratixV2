/**
 * Performance Benchmark Script for StratixV2
 *
 * Comprehensive benchmarking tool for:
 * - Service layer performance
 * - Database query execution
 * - Page render times
 * - Connection pool behavior
 * - Concurrent user simulation
 *
 * Usage:
 *   tsx scripts/performance-benchmark.ts [options]
 *
 * Options:
 *   --quick       Run quick benchmarks (10 iterations)
 *   --full        Run full benchmarks (100 iterations)
 *   --queries     Only benchmark database queries
 *   --services    Only benchmark service layer
 *   --concurrent  Only run concurrent user tests
 */

import { Pool } from 'pg';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';

// Service imports
import { getActivitiesForPage, getActivityStats } from '../lib/services/activities-service';
import { getObjectivesForPage, getObjectiveStats } from '../lib/services/objectives-service';
import { getInitiativesForPage, getInitiativeStats } from '../lib/services/initiatives-service';
import {
  getOKRDashboardStats,
  getDepartmentProgress,
  getTopPerformers,
  getUpcomingDeadlines,
  getCompletionTrends,
} from '../lib/services/analytics-service';

// Database setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED,
  max: 20,
});

/**
 * Benchmark result structure
 */
interface BenchmarkResult {
  testName: string;
  category: 'service' | 'query' | 'rls' | 'concurrent';
  iterations: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  successRate: number;
  recordsProcessed?: number;
  timestamp: string;
}

/**
 * Global results collection
 */
const results: BenchmarkResult[] = [];

/**
 * Utility: Format milliseconds to readable string
 */
function formatTime(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Utility: Calculate percentiles from sorted array
 */
function calculatePercentile(sortedTimes: number[], percentile: number): number {
  const index = Math.ceil((percentile / 100) * sortedTimes.length) - 1;
  return sortedTimes[Math.max(0, index)];
}

/**
 * Utility: Run a function multiple times and collect timing data
 */
async function benchmark(
  testName: string,
  category: BenchmarkResult['category'],
  fn: () => Promise<any>,
  iterations: number = 10,
  recordsProcessed?: number
): Promise<BenchmarkResult> {
  console.log(`\n🔄 Running: ${testName} (${iterations} iterations)...`);

  const times: number[] = [];
  let successCount = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await fn();
      const end = performance.now();
      times.push(end - start);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Iteration ${i + 1} failed:`, error);
      times.push(0);
    }
  }

  const sortedTimes = times.filter(t => t > 0).sort((a, b) => a - b);
  const avgTime = sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length;
  const minTime = sortedTimes[0] || 0;
  const maxTime = sortedTimes[sortedTimes.length - 1] || 0;
  const p50 = calculatePercentile(sortedTimes, 50);
  const p95 = calculatePercentile(sortedTimes, 95);
  const p99 = calculatePercentile(sortedTimes, 99);
  const successRate = (successCount / iterations) * 100;

  const result: BenchmarkResult = {
    testName,
    category,
    iterations,
    avgTime,
    minTime,
    maxTime,
    p50,
    p95,
    p99,
    successRate,
    recordsProcessed,
    timestamp: new Date().toISOString(),
  };

  results.push(result);

  console.log(`  ✅ Avg: ${formatTime(avgTime)} | P95: ${formatTime(p95)} | P99: ${formatTime(p99)}`);

  return result;
}

/**
 * Get a test user ID from the database
 */
async function getTestUserId(): Promise<string> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id FROM neon_auth.users_sync
      ORDER BY created_at DESC
      LIMIT 1
    `);
    if (result.rows.length === 0) {
      throw new Error('No users found in database for benchmarking');
    }
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * BENCHMARK: RLS Context Setup Overhead
 */
async function benchmarkRLSContext(userId: string, iterations: number) {
  console.log('\n📊 === RLS CONTEXT BENCHMARKING ===');

  await benchmark(
    'RLS Context Setup',
    'rls',
    async () => {
      const client = await pool.connect();
      try {
        await client.query('SELECT set_config($1, $2, false)', [
          'app.current_user_id',
          userId,
        ]);
      } finally {
        client.release();
      }
    },
    iterations
  );
}

/**
 * BENCHMARK: Service Layer Functions
 */
async function benchmarkServices(userId: string, iterations: number) {
  console.log('\n📊 === SERVICE LAYER BENCHMARKING ===');

  await benchmark('getObjectivesForPage', 'service', () => getObjectivesForPage(userId), iterations);
  await benchmark('getObjectiveStats', 'service', () => getObjectiveStats(userId), iterations);

  await benchmark('getInitiativesForPage', 'service', () => getInitiativesForPage(userId), iterations);
  await benchmark('getInitiativeStats', 'service', () => getInitiativeStats(userId), iterations);

  await benchmark('getActivitiesForPage', 'service', () => getActivitiesForPage(userId), iterations);
  await benchmark('getActivityStats', 'service', () => getActivityStats(userId), iterations);

  await benchmark('getOKRDashboardStats', 'service', () => getOKRDashboardStats(userId), iterations);
  await benchmark('getDepartmentProgress', 'service', () => getDepartmentProgress(userId), iterations);
  await benchmark('getTopPerformers', 'service', () => getTopPerformers(userId, 5), iterations);
  await benchmark('getUpcomingDeadlines', 'service', () => getUpcomingDeadlines(userId, 7), iterations);
  await benchmark('getCompletionTrends', 'service', () => getCompletionTrends(userId, 6), iterations);
}

/**
 * BENCHMARK: Raw Database Queries with EXPLAIN ANALYZE
 */
async function benchmarkQueries(userId: string) {
  console.log('\n📊 === DATABASE QUERY BENCHMARKING ===');

  const client = await pool.connect();
  try {
    // Set RLS context
    await client.query('SELECT set_config($1, $2, false)', ['app.current_user_id', userId]);

    // Query 1: Simple SELECT with RLS
    const query1 = `
      SELECT * FROM objectives
      WHERE tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = current_setting('app.current_user_id')::text
      )
      ORDER BY created_at DESC
      LIMIT 100
    `;

    console.log('\n🔍 Query: Simple SELECT with RLS filter');
    const explain1 = await client.query(`EXPLAIN ANALYZE ${query1}`);
    console.log(explain1.rows.map(r => r['QUERY PLAN']).join('\n'));

    // Query 2: JOIN with aggregate
    const query2 = `
      SELECT
        o.id,
        o.title,
        o.status,
        u.name as assignee_name
      FROM objectives o
      LEFT JOIN neon_auth.users_sync u ON o.assigned_to = u.id
      WHERE o.tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = current_setting('app.current_user_id')::text
      )
      ORDER BY o.created_at DESC
    `;

    console.log('\n🔍 Query: JOIN with users_sync');
    const explain2 = await client.query(`EXPLAIN ANALYZE ${query2}`);
    console.log(explain2.rows.map(r => r['QUERY PLAN']).join('\n'));

    // Query 3: Complex aggregation
    const query3 = `
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int as active,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
        COALESCE(AVG(CAST(progress_percentage AS NUMERIC)), 0)::int as avg_progress
      FROM objectives
      WHERE tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = current_setting('app.current_user_id')::text
      )
    `;

    console.log('\n🔍 Query: Aggregate statistics');
    const explain3 = await client.query(`EXPLAIN ANALYZE ${query3}`);
    console.log(explain3.rows.map(r => r['QUERY PLAN']).join('\n'));

    // Query 4: Multiple JOINs
    const query4 = `
      SELECT
        a.id,
        a.title,
        a.status,
        i.title as initiative_title,
        u.name as assignee_name
      FROM activities a
      INNER JOIN initiatives i ON a.initiative_id = i.id
      LEFT JOIN neon_auth.users_sync u ON a.assigned_to = u.id
      WHERE a.tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = current_setting('app.current_user_id')::text
      )
      ORDER BY
        CASE a.priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END ASC,
        a.due_date ASC NULLS LAST
    `;

    console.log('\n🔍 Query: Multiple JOINs with CASE ordering');
    const explain4 = await client.query(`EXPLAIN ANALYZE ${query4}`);
    console.log(explain4.rows.map(r => r['QUERY PLAN']).join('\n'));

    // Query 5: Dashboard analytics
    const query5 = `
      SELECT
        u.id,
        u.name,
        COUNT(*) FILTER (WHERE i.status = 'completed')::int as completed_initiatives,
        COUNT(*) FILTER (WHERE i.status = 'in_progress')::int as active_initiatives
      FROM neon_auth.users_sync u
      LEFT JOIN initiatives i ON i.assigned_to = u.id AND i.tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = current_setting('app.current_user_id')::text
      )
      WHERE u.id IN (
        SELECT DISTINCT assigned_to FROM initiatives
        WHERE tenant_id = (
          SELECT tenant_id FROM profiles WHERE id = current_setting('app.current_user_id')::text
        ) AND assigned_to IS NOT NULL
      )
      GROUP BY u.id, u.name
      ORDER BY completed_initiatives DESC
      LIMIT 5
    `;

    console.log('\n🔍 Query: Top performers analytics');
    const explain5 = await client.query(`EXPLAIN ANALYZE ${query5}`);
    console.log(explain5.rows.map(r => r['QUERY PLAN']).join('\n'));

  } finally {
    client.release();
  }
}

/**
 * BENCHMARK: Connection Pool Behavior
 */
async function benchmarkConnectionPool(userId: string, iterations: number) {
  console.log('\n📊 === CONNECTION POOL BENCHMARKING ===');

  // Test 1: Sequential connection usage
  await benchmark(
    'Sequential Connection Acquisition',
    'concurrent',
    async () => {
      const client = await pool.connect();
      try {
        await client.query('SELECT set_config($1, $2, false)', ['app.current_user_id', userId]);
        await client.query('SELECT COUNT(*) FROM objectives WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE id = current_setting(\'app.current_user_id\')::text)');
      } finally {
        client.release();
      }
    },
    iterations
  );

  // Test 2: Connection pool under load
  console.log('\n🔄 Testing connection pool with concurrent requests...');
  const concurrentCount = 50;
  const start = performance.now();

  const promises = Array.from({ length: concurrentCount }, async () => {
    const client = await pool.connect();
    try {
      await client.query('SELECT set_config($1, $2, false)', ['app.current_user_id', userId]);
      await client.query('SELECT COUNT(*) FROM objectives WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE id = current_setting(\'app.current_user_id\')::text)');
    } finally {
      client.release();
    }
  });

  await Promise.all(promises);
  const end = performance.now();

  console.log(`  ✅ ${concurrentCount} concurrent requests completed in ${formatTime(end - start)}`);
  console.log(`  ✅ Average time per request: ${formatTime((end - start) / concurrentCount)}`);
}

/**
 * BENCHMARK: Concurrent User Simulation
 */
async function benchmarkConcurrentUsers(userId: string) {
  console.log('\n📊 === CONCURRENT USER SIMULATION ===');

  const userCounts = [1, 5, 10, 20, 50];

  for (const userCount of userCounts) {
    console.log(`\n🔄 Simulating ${userCount} concurrent users...`);

    const start = performance.now();
    const promises = Array.from({ length: userCount }, async () => {
      // Simulate a full page load
      await getObjectivesForPage(userId);
      await getObjectiveStats(userId);
      await getInitiativesForPage(userId);
      await getInitiativeStats(userId);
      await getActivitiesForPage(userId);
      await getActivityStats(userId);
    });

    try {
      await Promise.all(promises);
      const end = performance.now();

      const totalTime = end - start;
      const avgTimePerUser = totalTime / userCount;

      console.log(`  ✅ Total time: ${formatTime(totalTime)}`);
      console.log(`  ✅ Avg time per user: ${formatTime(avgTimePerUser)}`);
      console.log(`  ✅ Throughput: ${(userCount / (totalTime / 1000)).toFixed(2)} req/sec`);

      results.push({
        testName: `Concurrent Users (${userCount})`,
        category: 'concurrent',
        iterations: userCount,
        avgTime: avgTimePerUser,
        minTime: avgTimePerUser,
        maxTime: avgTimePerUser,
        p50: avgTimePerUser,
        p95: avgTimePerUser,
        p99: avgTimePerUser,
        successRate: 100,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`  ❌ Failed with ${userCount} users:`, error);
    }
  }
}

/**
 * Generate markdown report
 */
function generateReport() {
  console.log('\n📄 Generating performance report...');

  const reportPath = path.join(__dirname, '../docs/performance-benchmark-report.md');

  let report = `# Performance Benchmark Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `**Environment:**\n`;
  report += `- Node: ${process.version}\n`;
  report += `- Database Pool Max: 20\n`;
  report += `- Connection Type: Unpooled (RLS-enabled)\n\n`;

  report += `## Executive Summary\n\n`;
  report += `Total tests run: ${results.length}\n`;
  report += `Test categories: Service Layer, Database Queries, RLS Context, Concurrent Load\n\n`;

  // Performance targets
  report += `## Performance Targets\n\n`;
  report += `| Metric | Target | Status |\n`;
  report += `|--------|--------|--------|\n`;

  const serviceAvg = results.filter(r => r.category === 'service').reduce((sum, r) => sum + r.avgTime, 0) / results.filter(r => r.category === 'service').length;
  report += `| Service Queries | <500ms | ${serviceAvg < 500 ? '✅ PASS' : '❌ FAIL'} (${formatTime(serviceAvg)}) |\n`;

  const rlsAvg = results.filter(r => r.category === 'rls').reduce((sum, r) => sum + r.avgTime, 0) / results.filter(r => r.category === 'rls').length || 0;
  report += `| RLS Context Setup | <50ms | ${rlsAvg < 50 ? '✅ PASS' : '❌ FAIL'} (${formatTime(rlsAvg)}) |\n\n`;

  // Detailed results by category
  const categories = ['service', 'query', 'rls', 'concurrent'] as const;

  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    if (categoryResults.length === 0) continue;

    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    report += `## ${categoryName} Benchmarks\n\n`;
    report += `| Test Name | Avg | P50 | P95 | P99 | Success Rate |\n`;
    report += `|-----------|-----|-----|-----|-----|-------------|\n`;

    for (const result of categoryResults) {
      report += `| ${result.testName} | ${formatTime(result.avgTime)} | ${formatTime(result.p50)} | ${formatTime(result.p95)} | ${formatTime(result.p99)} | ${result.successRate.toFixed(1)}% |\n`;
    }
    report += `\n`;
  }

  // Bottleneck analysis
  report += `## Bottleneck Analysis\n\n`;
  const slowestTests = [...results].sort((a, b) => b.p95 - a.p95).slice(0, 5);
  report += `### Top 5 Slowest Operations (by P95):\n\n`;
  for (let i = 0; i < slowestTests.length; i++) {
    const test = slowestTests[i];
    report += `${i + 1}. **${test.testName}** - P95: ${formatTime(test.p95)}\n`;
  }
  report += `\n`;

  // Recommendations
  report += `## Optimization Recommendations\n\n`;

  const hasSlowServices = results.some(r => r.category === 'service' && r.p95 > 500);
  if (hasSlowServices) {
    report += `### 🔴 Critical: Service Layer Optimization\n\n`;
    report += `Several service functions exceed the 500ms target:\n\n`;
    results.filter(r => r.category === 'service' && r.p95 > 500).forEach(r => {
      report += `- **${r.testName}**: P95 ${formatTime(r.p95)}\n`;
    });
    report += `\n**Recommendations:**\n`;
    report += `1. Add database indexes on frequently queried columns\n`;
    report += `2. Consider query result caching for dashboard statistics\n`;
    report += `3. Implement pagination for large result sets\n`;
    report += `4. Review N+1 query patterns in service layer\n\n`;
  }

  const hasSlowRLS = results.some(r => r.category === 'rls' && r.avgTime > 50);
  if (hasSlowRLS) {
    report += `### ⚠️ Warning: RLS Context Overhead\n\n`;
    report += `RLS context setup exceeds 50ms target. Consider:\n`;
    report += `1. Connection pooling optimization\n`;
    report += `2. Persistent connections for batch operations\n`;
    report += `3. Review RLS policy complexity\n\n`;
  }

  report += `### 📊 Index Optimization\n\n`;
  report += `Based on query analysis, consider adding these indexes:\n\n`;
  report += `\`\`\`sql\n`;
  report += `-- Tenant-based filtering (if not already present)\n`;
  report += `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_objectives_tenant_status ON objectives(tenant_id, status);\n`;
  report += `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_initiatives_tenant_status ON initiatives(tenant_id, status);\n`;
  report += `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_tenant_status ON activities(tenant_id, status);\n\n`;
  report += `-- Priority-based ordering\n`;
  report += `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_priority_due ON activities(priority, due_date) WHERE status != 'completed';\n\n`;
  report += `-- Analytics queries\n`;
  report += `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_objectives_tenant_end_date ON objectives(tenant_id, end_date) WHERE status != 'completed';\n`;
  report += `\`\`\`\n\n`;

  report += `### 🚀 Performance Tuning\n\n`;
  report += `1. **Query Optimization:**\n`;
  report += `   - Review EXPLAIN ANALYZE results for sequential scans\n`;
  report += `   - Optimize aggregate queries with materialized views\n`;
  report += `   - Consider query result caching for frequently accessed data\n\n`;

  report += `2. **Connection Management:**\n`;
  report += `   - Current pool size: 20 connections\n`;
  report += `   - Monitor connection pool saturation under load\n`;
  report += `   - Consider increasing pool size if hitting limits\n\n`;

  report += `3. **Application-Level Caching:**\n`;
  report += `   - Cache dashboard statistics (5-minute TTL)\n`;
  report += `   - Implement React Query/SWR for client-side caching\n`;
  report += `   - Use Redis for distributed caching (future enhancement)\n\n`;

  report += `4. **Database Configuration:**\n`;
  report += `   - Review PostgreSQL \`work_mem\` for complex queries\n`;
  report += `   - Enable \`pg_stat_statements\` for query monitoring\n`;
  report += `   - Consider partitioning for very large tables\n\n`;

  report += `## Next Steps\n\n`;
  report += `1. Review EXPLAIN ANALYZE output for slow queries\n`;
  report += `2. Implement recommended indexes in staging environment\n`;
  report += `3. Re-run benchmarks to measure improvement\n`;
  report += `4. Monitor performance in production with APM tools\n`;
  report += `5. Establish performance regression testing in CI/CD\n\n`;

  report += `## Raw Data\n\n`;
  report += `<details>\n<summary>Click to expand JSON results</summary>\n\n`;
  report += `\`\`\`json\n`;
  report += JSON.stringify(results, null, 2);
  report += `\n\`\`\`\n</details>\n`;

  fs.writeFileSync(reportPath, report);
  console.log(`  ✅ Report generated: ${reportPath}`);
}

/**
 * Main benchmark execution
 */
async function main() {
  const args = process.argv.slice(2);
  const isQuick = args.includes('--quick');
  const isFull = args.includes('--full');
  const onlyQueries = args.includes('--queries');
  const onlyServices = args.includes('--services');
  const onlyConcurrent = args.includes('--concurrent');

  const iterations = isQuick ? 10 : isFull ? 100 : 25;

  console.log('🚀 StratixV2 Performance Benchmarking Suite');
  console.log('============================================\n');
  console.log(`Iterations per test: ${iterations}`);
  console.log(`Mode: ${isQuick ? 'Quick' : isFull ? 'Full' : 'Standard'}\n`);

  try {
    // Get test user
    const userId = await getTestUserId();
    console.log(`✅ Test user ID: ${userId}\n`);

    // Run benchmarks based on flags
    if (!onlyQueries && !onlyConcurrent) {
      await benchmarkRLSContext(userId, iterations);
    }

    if (!onlyQueries && !onlyConcurrent) {
      await benchmarkServices(userId, iterations);
    }

    if (onlyQueries || (!onlyServices && !onlyConcurrent)) {
      await benchmarkQueries(userId);
    }

    if (!onlyQueries && !onlyServices) {
      await benchmarkConnectionPool(userId, iterations);
      await benchmarkConcurrentUsers(userId);
    }

    // Generate report
    generateReport();

    console.log('\n✅ All benchmarks completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Total tests: ${results.length}`);
    console.log(`   Success rate: ${((results.filter(r => r.successRate === 100).length / results.length) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
