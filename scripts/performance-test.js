#!/usr/bin/env node

const lighthouse = require('lighthouse');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const config = {
  baseUrl: 'http://localhost:3007',
  testPages: [
    '/',
    '/dashboard',
    '/objectives',
    '/initiatives',
    '/activities',
    '/analytics',
    '/companies',
    '/team',
    '/profile',
    '/import',
    '/insights'
  ],
  apiEndpoints: [
    '/api/objectives',
    '/api/initiatives', 
    '/api/activities',
    '/api/companies',
    '/api/profiles',
    '/api/analytics/summary',
    '/api/health'
  ],
  browsers: ['chrome', 'firefox', 'safari'],
  outputDir: './performance-results'
};

// Performance thresholds
const thresholds = {
  lighthouse: {
    performance: 80,
    accessibility: 90,
    bestPractices: 80,
    seo: 80
  },
  coreWebVitals: {
    LCP: 2500, // Largest Contentful Paint (ms)
    FID: 100,  // First Input Delay (ms) 
    CLS: 0.1   // Cumulative Layout Shift
  },
  pageLoad: {
    maxLoadTime: 3000, // ms
    maxTTFB: 800      // Time to First Byte (ms)
  },
  api: {
    maxResponseTime: 200 // ms
  },
  bundle: {
    maxJSSize: 200 * 1024,  // 200KB gzipped
    maxCSSSize: 50 * 1024   // 50KB gzipped
  }
};

class PerformanceTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      },
      summary: {},
      details: {}
    };
  }

  async run() {
    console.log('🚀 Starting Performance Testing Suite');
    console.log('=====================================');
    
    await this.ensureOutputDir();
    
    // Test database performance first
    await this.testDatabasePerformance();
    
    // Test page load times and Core Web Vitals
    await this.testPagePerformance();
    
    // Test API endpoints
    await this.testAPIPerformance();
    
    // Test bundle sizes
    await this.testBundleSize();
    
    // Generate comprehensive report
    await this.generateReport();
    
    console.log('\n✅ Performance testing completed!');
    console.log(`📊 Results saved to: ${config.outputDir}`);
  }

  async ensureOutputDir() {
    try {
      await fs.mkdir(config.outputDir, { recursive: true });
    } catch (error) {
      console.error('Error creating output directory:', error);
    }
  }

  async testDatabasePerformance() {
    console.log('\n📊 Testing Database Performance...');
    
    const dbResults = {
      connectionPool: {},
      queryPerformance: {},
      healthMetrics: {}
    };

    try {
      // Test database connection and get performance metrics
      const response = await fetch(`${config.baseUrl}/api/performance/database`);
      if (response.ok) {
        const data = await response.json();
        dbResults.connectionPool = data.poolMetrics || {};
        dbResults.queryPerformance = data.queryPerformance || {};
        dbResults.healthMetrics = data.healthMetrics || {};
        
        console.log(`   Connection Pool Utilization: ${data.poolMetrics?.currentMetrics?.utilizationRate || 0}%`);
        console.log(`   Average Query Time: ${data.queryPerformance?.averageQueryTime || 0}ms`);
        console.log(`   Total Queries: ${data.queryPerformance?.totalQueries || 0}`);
      }
    } catch (error) {
      console.error('   ❌ Database performance test failed:', error.message);
      dbResults.error = error.message;
    }

    this.results.details.database = dbResults;
  }

  async testPagePerformance() {
    console.log('\n🌐 Testing Page Performance & Core Web Vitals...');
    
    const pageResults = {};
    
    // Launch browser for testing
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    for (const pagePath of config.testPages) {
      const url = `${config.baseUrl}${pagePath}`;
      console.log(`   Testing: ${url}`);
      
      try {
        // Run Lighthouse audit
        const lighthouseResult = await lighthouse(url, {
          port: (new URL(browser.wsEndpoint())).port,
          output: 'json',
          logLevel: 'error'
        });

        // Get Core Web Vitals
        const page = await browser.newPage();
        const startTime = Date.now();
        
        await page.goto(url, { waitUntil: 'networkidle0' });
        const loadTime = Date.now() - startTime;
        
        // Get performance metrics
        const metrics = await page.metrics();
        const performanceEntries = await page.evaluate(() => {
          return JSON.stringify(performance.getEntriesByType('navigation'));
        });
        
        const navigationEntries = JSON.parse(performanceEntries);
        const navEntry = navigationEntries[0];
        
        pageResults[pagePath] = {
          lighthouse: {
            performance: lighthouseResult.lhr.categories.performance.score * 100,
            accessibility: lighthouseResult.lhr.categories.accessibility.score * 100,
            bestPractices: lighthouseResult.lhr.categories['best-practices'].score * 100,
            seo: lighthouseResult.lhr.categories.seo.score * 100,
            audits: {
              LCP: lighthouseResult.lhr.audits['largest-contentful-paint']?.numericValue || 0,
              FID: lighthouseResult.lhr.audits['max-potential-fid']?.numericValue || 0,
              CLS: lighthouseResult.lhr.audits['cumulative-layout-shift']?.numericValue || 0,
              TTFB: lighthouseResult.lhr.audits['server-response-time']?.numericValue || 0
            }
          },
          timing: {
            loadTime,
            domContentLoaded: navEntry?.domContentLoadedEventEnd - navEntry?.domContentLoadedEventStart || 0,
            firstPaint: navEntry?.responseEnd - navEntry?.requestStart || 0,
            ttfb: navEntry?.responseStart - navEntry?.requestStart || 0
          },
          metrics: {
            JSHeapUsedSize: metrics.JSHeapUsedSize,
            JSHeapTotalSize: metrics.JSHeapTotalSize,
            LayoutDuration: metrics.LayoutDuration,
            ScriptDuration: metrics.ScriptDuration
          }
        };
        
        await page.close();
        
        // Log results
        const lh = pageResults[pagePath].lighthouse;
        const timing = pageResults[pagePath].timing;
        console.log(`     Performance: ${lh.performance}% | LCP: ${lh.audits.LCP}ms | Load: ${timing.loadTime}ms`);
        
      } catch (error) {
        console.error(`     ❌ Failed to test ${pagePath}:`, error.message);
        pageResults[pagePath] = { error: error.message };
      }
    }

    await browser.close();
    this.results.details.pages = pageResults;
  }

  async testAPIPerformance() {
    console.log('\n🔗 Testing API Performance...');
    
    const apiResults = {};
    
    for (const endpoint of config.apiEndpoints) {
      const url = `${config.baseUrl}${endpoint}`;
      console.log(`   Testing: ${endpoint}`);
      
      try {
        const startTime = Date.now();
        const response = await fetch(url);
        const responseTime = Date.now() - startTime;
        
        apiResults[endpoint] = {
          status: response.status,
          responseTime,
          contentLength: response.headers.get('content-length') || 0,
          contentType: response.headers.get('content-type') || '',
          success: response.ok
        };
        
        console.log(`     Status: ${response.status} | Time: ${responseTime}ms`);
        
      } catch (error) {
        console.error(`     ❌ Failed to test ${endpoint}:`, error.message);
        apiResults[endpoint] = { error: error.message };
      }
    }
    
    this.results.details.api = apiResults;
  }

  async testBundleSize() {
    console.log('\n📦 Analyzing Bundle Size...');
    
    const bundleResults = {
      javascript: {},
      css: {},
      assets: {}
    };

    try {
      // Get build info from Next.js
      const buildPath = path.join(process.cwd(), '.next');
      const staticPath = path.join(buildPath, 'static');
      
      // Analyze JS bundles
      const jsPath = path.join(staticPath, 'chunks');
      try {
        const jsFiles = await fs.readdir(jsPath);
        let totalJSSize = 0;
        
        for (const file of jsFiles) {
          if (file.endsWith('.js')) {
            const filePath = path.join(jsPath, file);
            const stats = await fs.stat(filePath);
            totalJSSize += stats.size;
            bundleResults.javascript[file] = stats.size;
          }
        }
        
        bundleResults.javascript.total = totalJSSize;
        console.log(`   Total JS Size: ${(totalJSSize / 1024).toFixed(2)} KB`);
        
      } catch (error) {
        console.log(`   ⚠️ Could not analyze JS bundles: ${error.message}`);
      }
      
      // Analyze CSS bundles
      const cssPath = path.join(staticPath, 'css');
      try {
        const cssFiles = await fs.readdir(cssPath);
        let totalCSSSize = 0;
        
        for (const file of cssFiles) {
          if (file.endsWith('.css')) {
            const filePath = path.join(cssPath, file);
            const stats = await fs.stat(filePath);
            totalCSSSize += stats.size;
            bundleResults.css[file] = stats.size;
          }
        }
        
        bundleResults.css.total = totalCSSSize;
        console.log(`   Total CSS Size: ${(totalCSSSize / 1024).toFixed(2)} KB`);
        
      } catch (error) {
        console.log(`   ⚠️ Could not analyze CSS bundles: ${error.message}`);
      }
      
    } catch (error) {
      console.error('   ❌ Bundle analysis failed:', error.message);
      bundleResults.error = error.message;
    }
    
    this.results.details.bundles = bundleResults;
  }

  async generateReport() {
    console.log('\n📋 Generating Performance Report...');
    
    // Calculate summary statistics
    this.calculateSummary();
    
    // Save detailed results
    await this.saveResults();
    
    // Print summary to console
    this.printSummary();
  }

  calculateSummary() {
    const summary = {
      overall: 'PASS',
      issues: [],
      recommendations: []
    };

    // Analyze page performance
    const pages = this.results.details.pages || {};
    const pageScores = Object.values(pages)
      .filter(p => p.lighthouse)
      .map(p => p.lighthouse.performance);
    
    if (pageScores.length > 0) {
      summary.averagePerformanceScore = pageScores.reduce((a, b) => a + b, 0) / pageScores.length;
      
      if (summary.averagePerformanceScore < thresholds.lighthouse.performance) {
        summary.overall = 'FAIL';
        summary.issues.push(`Average performance score (${summary.averagePerformanceScore.toFixed(1)}%) below threshold (${thresholds.lighthouse.performance}%)`);
      }
    }

    // Analyze API performance
    const apis = this.results.details.api || {};
    const apiTimes = Object.values(apis)
      .filter(a => a.responseTime)
      .map(a => a.responseTime);
    
    if (apiTimes.length > 0) {
      summary.averageApiResponseTime = apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length;
      
      if (summary.averageApiResponseTime > thresholds.api.maxResponseTime) {
        summary.overall = 'FAIL';
        summary.issues.push(`Average API response time (${summary.averageApiResponseTime.toFixed(1)}ms) exceeds threshold (${thresholds.api.maxResponseTime}ms)`);
      }
    }

    // Add recommendations
    if (summary.issues.length === 0) {
      summary.recommendations.push('All performance metrics are within acceptable thresholds');
    } else {
      summary.recommendations.push('Consider optimizing slow pages and API endpoints');
      summary.recommendations.push('Review database query performance');
      summary.recommendations.push('Implement caching strategies where appropriate');
    }

    this.results.summary = summary;
  }

  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = path.join(config.outputDir, `performance-results-${timestamp}.json`);
    
    await fs.writeFile(resultsFile, JSON.stringify(this.results, null, 2));
    console.log(`   📁 Detailed results saved to: ${resultsFile}`);
  }

  printSummary() {
    const summary = this.results.summary;
    
    console.log('\n' + '='.repeat(50));
    console.log('📈 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`Overall Result: ${summary.overall === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    
    if (summary.averagePerformanceScore !== undefined) {
      console.log(`Average Performance Score: ${summary.averagePerformanceScore.toFixed(1)}%`);
    }
    
    if (summary.averageApiResponseTime !== undefined) {
      console.log(`Average API Response Time: ${summary.averageApiResponseTime.toFixed(1)}ms`);
    }
    
    if (summary.issues.length > 0) {
      console.log('\n🚨 Issues Found:');
      summary.issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }
    
    if (summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      summary.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
    
    console.log('='.repeat(50));
  }
}

// Create API endpoint to expose database performance metrics
const createPerformanceAPI = `
// This should be added to /app/api/performance/database/route.ts
import { NextResponse } from 'next/server';
import { getAllPerformanceData } from '@/lib/database/client';

export async function GET() {
  try {
    const performanceData = getAllPerformanceData();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...performanceData
    });
  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json(
      { error: 'Failed to get performance data' },
      { status: 500 }
    );
  }
}
`;

// Run the performance test if called directly
if (require.main === module) {
  const tester = new PerformanceTester();
  tester.run().catch(console.error);
}

module.exports = { PerformanceTester, config, thresholds };