/**
 * Browser-Based Performance Benchmark Script
 *
 * Measures actual page load times for all migrated pages using Playwright.
 * This script simulates real user interactions and measures:
 * - Time to First Byte (TTFB)
 * - First Contentful Paint (FCP)
 * - Largest Contentful Paint (LCP)
 * - Time to Interactive (TTI)
 * - Total page load time
 *
 * Usage:
 *   tsx scripts/browser-performance-benchmark.ts [--url=http://localhost:3000]
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const NUM_ITERATIONS = 10;
const CLEAR_CACHE_BETWEEN_RUNS = true;

interface PageMetrics {
  pageName: string;
  url: string;
  iteration: number;
  ttfb: number;
  fcp: number;
  lcp: number;
  tti: number;
  totalLoadTime: number;
  recordCount?: number;
  timestamp: string;
}

interface BenchmarkSummary {
  pageName: string;
  url: string;
  targetSLA: number;
  iterations: number;
  avgLoadTime: number;
  minLoadTime: number;
  maxLoadTime: number;
  p50: number;
  p95: number;
  p99: number;
  passedSLA: boolean;
  allMetrics: PageMetrics[];
}

const results: BenchmarkSummary[] = [];

/**
 * Pages to benchmark with their SLA targets (in milliseconds)
 */
const pagesToTest = [
  { name: 'Objectives Page', path: '/tools/objectives', sla: 2000, recordTarget: 100 },
  { name: 'Initiatives Page', path: '/tools/initiatives', sla: 2000, recordTarget: 100 },
  { name: 'Activities Page', path: '/tools/activities', sla: 2000, recordTarget: 200 },
  { name: 'OKR Dashboard', path: '/tools/okr', sla: 1000, recordTarget: 0 },
  { name: 'Analytics Page', path: '/tools/analytics', sla: 3000, recordTarget: 0 },
];

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

/**
 * Format time in readable format
 */
function formatTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Authenticate and get session cookie
 */
async function authenticate(page: Page): Promise<void> {
  console.log('  🔐 Authenticating...');

  // Navigate to login page
  await page.goto(`${BASE_URL}/handler/sign-in`);

  // Check if already authenticated
  const isAuthenticated = await page.evaluate(() => {
    return document.cookie.includes('stack-session');
  });

  if (isAuthenticated) {
    console.log('  ✅ Already authenticated');
    return;
  }

  // Attempt to sign in (you may need to provide credentials via env vars)
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in environment');
  }

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(`${BASE_URL}/tools/**`, { timeout: 10000 });
  console.log('  ✅ Authentication successful');
}

/**
 * Measure page performance metrics
 */
async function measurePagePerformance(
  page: Page,
  pageName: string,
  url: string,
  iteration: number
): Promise<PageMetrics> {
  // Clear cache if configured
  if (CLEAR_CACHE_BETWEEN_RUNS) {
    const context = page.context();
    await context.clearCookies();
    await context.clearPermissions();
    // Re-authenticate after cache clear
    await authenticate(page);
  }

  const startTime = Date.now();

  // Navigate to page
  const response = await page.goto(url, {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  if (!response) {
    throw new Error(`Failed to load ${url}`);
  }

  // Get performance metrics using Performance API
  const metrics = await page.evaluate(() => {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');

    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;

    // LCP is more complex - we'll use a simplified approach
    const lcp = (performance as any).getEntriesByType?.('largest-contentful-paint')?.[0]?.startTime || 0;

    return {
      ttfb: perfData.responseStart - perfData.requestStart,
      fcp: fcp,
      lcp: lcp > 0 ? lcp : perfData.loadEventEnd - perfData.fetchStart,
      domInteractive: perfData.domInteractive - perfData.fetchStart,
      loadComplete: perfData.loadEventEnd - perfData.fetchStart,
    };
  });

  const totalLoadTime = Date.now() - startTime;

  // Try to count records on page (for data-heavy pages)
  const recordCount = await page.evaluate(() => {
    // Look for common data table/list patterns
    const rows = document.querySelectorAll('table tbody tr, [role="row"], .data-row');
    return rows.length;
  });

  return {
    pageName,
    url,
    iteration,
    ttfb: metrics.ttfb,
    fcp: metrics.fcp,
    lcp: metrics.lcp,
    tti: metrics.domInteractive,
    totalLoadTime,
    recordCount: recordCount > 0 ? recordCount : undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Benchmark a single page
 */
async function benchmarkPage(
  browser: Browser,
  pageName: string,
  pagePath: string,
  sla: number
): Promise<BenchmarkSummary> {
  console.log(`\n🔄 Benchmarking: ${pageName}`);
  console.log(`   URL: ${BASE_URL}${pagePath}`);
  console.log(`   SLA Target: ${formatTime(sla)}`);
  console.log(`   Iterations: ${NUM_ITERATIONS}`);

  const url = `${BASE_URL}${pagePath}`;
  const allMetrics: PageMetrics[] = [];

  // Create a new context for each page to ensure isolation
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    // Authenticate once for all iterations
    await authenticate(page);

    // Run iterations
    for (let i = 0; i < NUM_ITERATIONS; i++) {
      process.stdout.write(`\r   Iteration ${i + 1}/${NUM_ITERATIONS}...`);

      try {
        const metrics = await measurePagePerformance(page, pageName, url, i + 1);
        allMetrics.push(metrics);

        // Small delay between iterations
        await page.waitForTimeout(500);
      } catch (error) {
        console.error(`\n   ❌ Iteration ${i + 1} failed:`, error);
        // Continue with next iteration
      }
    }

    console.log(''); // New line after progress indicator

    // Calculate statistics
    const loadTimes = allMetrics.map(m => m.totalLoadTime).sort((a, b) => a - b);
    const avgLoadTime = loadTimes.reduce((sum, t) => sum + t, 0) / loadTimes.length;
    const minLoadTime = loadTimes[0] || 0;
    const maxLoadTime = loadTimes[loadTimes.length - 1] || 0;
    const p50 = calculatePercentile(loadTimes, 50);
    const p95 = calculatePercentile(loadTimes, 95);
    const p99 = calculatePercentile(loadTimes, 99);
    const passedSLA = p95 <= sla;

    console.log(`   ✅ Avg: ${formatTime(avgLoadTime)} | P95: ${formatTime(p95)} | P99: ${formatTime(p99)}`);
    console.log(`   ${passedSLA ? '✅ PASSED' : '❌ FAILED'} SLA (${formatTime(sla)})`);

    return {
      pageName,
      url,
      targetSLA: sla,
      iterations: NUM_ITERATIONS,
      avgLoadTime,
      minLoadTime,
      maxLoadTime,
      p50,
      p95,
      p99,
      passedSLA,
      allMetrics,
    };
  } finally {
    await context.close();
  }
}

/**
 * Generate comprehensive markdown report
 */
function generateReport() {
  console.log('\n📄 Generating performance report...');

  const reportPath = path.join(__dirname, '../docs/performance-benchmark-results.md');

  let report = `# Performance Benchmark Results\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Test Environment:** ${BASE_URL}\n`;
  report += `**Browser:** Chromium (Playwright)\n`;
  report += `**Viewport:** 1920x1080\n`;
  report += `**Iterations per page:** ${NUM_ITERATIONS}\n`;
  report += `**Cache cleared between runs:** ${CLEAR_CACHE_BETWEEN_RUNS ? 'Yes' : 'No'}\n\n`;

  // Executive Summary
  report += `## Executive Summary\n\n`;
  const totalPages = results.length;
  const passedPages = results.filter(r => r.passedSLA).length;
  const failedPages = results.filter(r => !r.passedSLA).length;

  report += `- **Total Pages Tested:** ${totalPages}\n`;
  report += `- **Passed SLA:** ${passedPages} (${((passedPages / totalPages) * 100).toFixed(1)}%)\n`;
  report += `- **Failed SLA:** ${failedPages} (${((failedPages / totalPages) * 100).toFixed(1)}%)\n\n`;

  // SLA Compliance Table
  report += `## SLA Compliance Summary\n\n`;
  report += `| Page | Target SLA | P95 Latency | Status |\n`;
  report += `|------|------------|-------------|--------|\n`;

  for (const result of results) {
    const status = result.passedSLA ? '✅ PASS' : '❌ FAIL';
    const delta = result.p95 - result.targetSLA;
    const deltaStr = delta > 0 ? `+${formatTime(delta)}` : formatTime(Math.abs(delta));
    report += `| ${result.pageName} | ${formatTime(result.targetSLA)} | ${formatTime(result.p95)} (${deltaStr}) | ${status} |\n`;
  }
  report += `\n`;

  // Detailed Results for Each Page
  report += `## Detailed Performance Results\n\n`;

  for (const result of results) {
    report += `### ${result.pageName}\n\n`;
    report += `**URL:** \`${result.url}\`\n\n`;
    report += `**Performance Metrics:**\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Target SLA | ${formatTime(result.targetSLA)} |\n`;
    report += `| Average Load Time | ${formatTime(result.avgLoadTime)} |\n`;
    report += `| Min Load Time | ${formatTime(result.minLoadTime)} |\n`;
    report += `| Max Load Time | ${formatTime(result.maxLoadTime)} |\n`;
    report += `| P50 (Median) | ${formatTime(result.p50)} |\n`;
    report += `| P95 | ${formatTime(result.p95)} |\n`;
    report += `| P99 | ${formatTime(result.p99)} |\n`;
    report += `| SLA Status | ${result.passedSLA ? '✅ PASSED' : '❌ FAILED'} |\n`;

    // Show record count if available
    const firstMetric = result.allMetrics[0];
    if (firstMetric?.recordCount) {
      report += `| Records Loaded | ${firstMetric.recordCount} |\n`;
    }
    report += `\n`;

    // Performance breakdown
    const avgTTFB = result.allMetrics.reduce((sum, m) => sum + m.ttfb, 0) / result.allMetrics.length;
    const avgFCP = result.allMetrics.reduce((sum, m) => sum + m.fcp, 0) / result.allMetrics.length;
    const avgLCP = result.allMetrics.reduce((sum, m) => sum + m.lcp, 0) / result.allMetrics.length;
    const avgTTI = result.allMetrics.reduce((sum, m) => sum + m.tti, 0) / result.allMetrics.length;

    report += `**Performance Breakdown (Averages):**\n\n`;
    report += `- Time to First Byte (TTFB): ${formatTime(avgTTFB)}\n`;
    report += `- First Contentful Paint (FCP): ${formatTime(avgFCP)}\n`;
    report += `- Largest Contentful Paint (LCP): ${formatTime(avgLCP)}\n`;
    report += `- Time to Interactive (TTI): ${formatTime(avgTTI)}\n\n`;

    // Recommendations if failed
    if (!result.passedSLA) {
      report += `**⚠️ Optimization Recommendations:**\n\n`;

      if (avgTTFB > 500) {
        report += `1. **High TTFB (${formatTime(avgTTFB)}):**\n`;
        report += `   - Review database query performance\n`;
        report += `   - Check if indexes are being used effectively\n`;
        report += `   - Consider query result caching\n`;
        report += `   - Verify RLS policies are not causing overhead\n\n`;
      }

      if (avgLCP - avgFCP > 1000) {
        report += `2. **Slow Content Loading (LCP):**\n`;
        report += `   - Optimize image loading (use Next.js Image component)\n`;
        report += `   - Implement lazy loading for below-fold content\n`;
        report += `   - Consider code splitting for heavy components\n\n`;
      }

      if (avgTTI > result.targetSLA * 0.7) {
        report += `3. **High Time to Interactive:**\n`;
        report += `   - Reduce JavaScript bundle size\n`;
        report += `   - Defer non-critical scripts\n`;
        report += `   - Optimize React component rendering\n\n`;
      }
    }
  }

  // Overall Recommendations
  report += `## Overall Optimization Recommendations\n\n`;

  const hasSlowPages = results.some(r => !r.passedSLA);

  if (hasSlowPages) {
    report += `### 🔴 Critical Issues\n\n`;
    const failedResults = results.filter(r => !r.passedSLA);
    report += `The following pages failed to meet SLA targets:\n\n`;
    for (const result of failedResults) {
      const delta = result.p95 - result.targetSLA;
      report += `- **${result.pageName}**: Exceeded by ${formatTime(delta)} (${((delta / result.targetSLA) * 100).toFixed(1)}%)\n`;
    }
    report += `\n`;
  }

  report += `### Database Optimization\n\n`;
  report += `1. **Run EXPLAIN ANALYZE on slow queries:**\n`;
  report += `   \`\`\`bash\n`;
  report += `   tsx scripts/performance-benchmark.ts --queries\n`;
  report += `   \`\`\`\n\n`;

  report += `2. **Verify indexes are in place:**\n`;
  report += `   - \`objectives_tenant_idx\` on objectives table\n`;
  report += `   - \`initiatives_tenant_idx\` on initiatives table\n`;
  report += `   - \`activities_tenant_idx\` on activities table\n`;
  report += `   - Composite indexes for common filter combinations\n\n`;

  report += `3. **Consider query optimization:**\n`;
  report += `   - Use \`Promise.all()\` for parallel data fetching\n`;
  report += `   - Implement result caching for dashboard aggregates\n`;
  report += `   - Review N+1 query patterns in service layer\n\n`;

  report += `### Frontend Optimization\n\n`;
  report += `1. **Code Splitting:**\n`;
  report += `   - Use dynamic imports for heavy components\n`;
  report += `   - Lazy load charts and visualizations\n`;
  report += `   - Split vendor bundles\n\n`;

  report += `2. **Caching Strategy:**\n`;
  report += `   - Implement SWR/React Query for client-side caching\n`;
  report += `   - Use Next.js caching for static content\n`;
  report += `   - Consider CDN for assets\n\n`;

  report += `3. **Rendering Optimization:**\n`;
  report += `   - Use React.memo for expensive components\n`;
  report += `   - Implement virtualization for long lists\n`;
  report += `   - Optimize re-render patterns\n\n`;

  report += `## Next Steps\n\n`;
  report += `1. ✅ Performance baseline established\n`;
  report += `2. ${hasSlowPages ? '🔴' : '✅'} Address SLA failures (if any)\n`;
  report += `3. 📊 Run database query analysis: \`tsx scripts/performance-benchmark.ts --queries\`\n`;
  report += `4. 🔍 Profile slow pages in browser DevTools\n`;
  report += `5. ⚡ Implement optimization recommendations\n`;
  report += `6. 🔄 Re-run benchmarks to measure improvement\n`;
  report += `7. 📈 Set up continuous performance monitoring in CI/CD\n\n`;

  // Raw data
  report += `## Raw Data\n\n`;
  report += `<details>\n<summary>Click to expand detailed metrics (JSON)</summary>\n\n`;
  report += `\`\`\`json\n`;
  report += JSON.stringify(results, null, 2);
  report += `\n\`\`\`\n</details>\n`;

  // Ensure docs directory exists
  const docsDir = path.join(__dirname, '../docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, report);
  console.log(`  ✅ Report generated: ${reportPath}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 StratixV2 Browser Performance Benchmarking');
  console.log('==============================================\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Iterations: ${NUM_ITERATIONS}`);
  console.log(`Cache clearing: ${CLEAR_CACHE_BETWEEN_RUNS ? 'Enabled' : 'Disabled'}\n`);

  let browser: Browser | null = null;

  try {
    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({
      headless: true,
    });
    console.log('✅ Browser launched\n');

    // Run benchmarks for each page
    for (const pageTest of pagesToTest) {
      const summary = await benchmarkPage(
        browser,
        pageTest.name,
        pageTest.path,
        pageTest.sla
      );
      results.push(summary);
    }

    // Generate report
    generateReport();

    console.log('\n✅ All benchmarks completed successfully!\n');

    // Print summary
    console.log('📊 Summary:');
    console.log(`   Pages tested: ${results.length}`);
    console.log(`   Passed SLA: ${results.filter(r => r.passedSLA).length}`);
    console.log(`   Failed SLA: ${results.filter(r => !r.passedSLA).length}`);

    // Exit with error if any page failed
    const hasFailures = results.some(r => !r.passedSLA);
    process.exit(hasFailures ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
