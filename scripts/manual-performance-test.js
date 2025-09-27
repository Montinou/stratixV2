#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

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
  outputDir: './performance-results'
};

class ManualPerformanceTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      pages: {},
      summary: {}
    };
  }

  async run() {
    console.log('🚀 Running Manual Performance Tests');
    console.log('==================================');
    
    await this.ensureOutputDir();
    await this.testPagePerformance();
    await this.generateReport();
    
    console.log('✅ Performance testing completed!');
  }

  async ensureOutputDir() {
    try {
      await fs.mkdir(config.outputDir, { recursive: true });
    } catch (error) {
      console.error('Error creating output directory:', error);
    }
  }

  async testPagePerformance() {
    console.log('\n🌐 Testing Page Load Performance...');
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    for (const pagePath of config.testPages) {
      const url = `${config.baseUrl}${pagePath}`;
      console.log(`   Testing: ${url}`);
      
      try {
        const page = await browser.newPage();
        
        // Enable performance monitoring
        await page.setCacheEnabled(false);
        
        // Measure page load time
        const startTime = Date.now();
        const response = await page.goto(url, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });
        const loadTime = Date.now() - startTime;
        
        // Get navigation timing
        const performanceEntries = await page.evaluate(() => {
          const entries = performance.getEntriesByType('navigation');
          const paintEntries = performance.getEntriesByType('paint');
          return {
            navigation: entries[0],
            paints: paintEntries
          };
        });
        
        // Get resource timing
        const resources = await page.evaluate(() => {
          return performance.getEntriesByType('resource').map(r => ({
            name: r.name,
            duration: r.duration,
            size: r.transferSize || 0,
            type: r.initiatorType
          }));
        });
        
        // Calculate metrics
        const nav = performanceEntries.navigation;
        const metrics = {
          loadTime,
          domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart : 0,
          firstPaint: performanceEntries.paints.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: performanceEntries.paints.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          ttfb: nav ? nav.responseStart - nav.requestStart : 0,
          domInteractive: nav ? nav.domInteractive - nav.navigationStart : 0
        };
        
        // Analyze resources
        const resourceAnalysis = {
          total: resources.length,
          totalSize: resources.reduce((sum, r) => sum + r.size, 0),
          slowestResource: resources.reduce((prev, curr) => prev.duration > curr.duration ? prev : curr, {}),
          byType: resources.reduce((acc, r) => {
            acc[r.type] = (acc[r.type] || 0) + 1;
            return acc;
          }, {})
        };
        
        this.results.pages[pagePath] = {
          url,
          status: response.status(),
          metrics,
          resources: resourceAnalysis,
          success: response.ok()
        };
        
        console.log(`     Status: ${response.status()} | Load: ${loadTime}ms | FCP: ${metrics.firstContentfulPaint.toFixed(0)}ms | TTFB: ${metrics.ttfb.toFixed(0)}ms`);
        
        await page.close();
        
      } catch (error) {
        console.error(`     ❌ Failed to test ${pagePath}:`, error.message);
        this.results.pages[pagePath] = { error: error.message };
      }
    }

    await browser.close();
  }

  async generateReport() {
    console.log('\n📋 Generating Performance Report...');
    
    // Calculate summary
    const pageResults = Object.values(this.results.pages).filter(p => p.metrics);
    
    if (pageResults.length > 0) {
      this.results.summary = {
        averageLoadTime: pageResults.reduce((sum, p) => sum + p.metrics.loadTime, 0) / pageResults.length,
        averageTTFB: pageResults.reduce((sum, p) => sum + p.metrics.ttfb, 0) / pageResults.length,
        averageFCP: pageResults.reduce((sum, p) => sum + p.metrics.firstContentfulPaint, 0) / pageResults.length,
        totalPages: pageResults.length,
        successfulPages: pageResults.filter(p => p.success).length,
        failedPages: pageResults.filter(p => !p.success).length
      };
    }
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = path.join(config.outputDir, `manual-performance-${timestamp}.json`);
    
    await fs.writeFile(resultsFile, JSON.stringify(this.results, null, 2));
    console.log(`   📁 Results saved to: ${resultsFile}`);
    
    // Print summary
    this.printSummary();
  }

  printSummary() {
    const summary = this.results.summary;
    
    console.log('\n' + '='.repeat(50));
    console.log('📈 MANUAL PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(50));
    
    if (summary.totalPages > 0) {
      console.log(`Total Pages Tested: ${summary.totalPages}`);
      console.log(`Successful: ${summary.successfulPages} | Failed: ${summary.failedPages}`);
      console.log(`Average Load Time: ${summary.averageLoadTime.toFixed(0)}ms`);
      console.log(`Average TTFB: ${summary.averageTTFB.toFixed(0)}ms`);
      console.log(`Average First Contentful Paint: ${summary.averageFCP.toFixed(0)}ms`);
      
      // Performance assessment
      const assessment = this.assessPerformance(summary);
      console.log(`\nPerformance Assessment: ${assessment.overall}`);
      
      if (assessment.issues.length > 0) {
        console.log('\n🚨 Issues Found:');
        assessment.issues.forEach((issue, i) => {
          console.log(`   ${i + 1}. ${issue}`);
        });
      }
      
      if (assessment.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        assessment.recommendations.forEach((rec, i) => {
          console.log(`   ${i + 1}. ${rec}`);
        });
      }
    } else {
      console.log('❌ No successful page tests completed');
    }
    
    console.log('='.repeat(50));
  }

  assessPerformance(summary) {
    const assessment = {
      overall: 'GOOD',
      issues: [],
      recommendations: []
    };

    // Assess load time
    if (summary.averageLoadTime > 3000) {
      assessment.overall = 'POOR';
      assessment.issues.push(`Average load time (${summary.averageLoadTime.toFixed(0)}ms) exceeds 3s threshold`);
      assessment.recommendations.push('Optimize page load performance with code splitting and lazy loading');
    } else if (summary.averageLoadTime > 2000) {
      assessment.overall = 'FAIR';
      assessment.issues.push(`Average load time (${summary.averageLoadTime.toFixed(0)}ms) exceeds 2s best practice`);
      assessment.recommendations.push('Consider optimizing bundle size and implementing caching');
    }

    // Assess TTFB
    if (summary.averageTTFB > 800) {
      assessment.overall = assessment.overall === 'GOOD' ? 'FAIR' : assessment.overall;
      assessment.issues.push(`Average TTFB (${summary.averageTTFB.toFixed(0)}ms) is high`);
      assessment.recommendations.push('Optimize server response time and database queries');
    }

    // Assess FCP
    if (summary.averageFCP > 2500) {
      assessment.overall = assessment.overall === 'GOOD' ? 'FAIR' : assessment.overall;
      assessment.issues.push(`Average FCP (${summary.averageFCP.toFixed(0)}ms) exceeds 2.5s threshold`);
      assessment.recommendations.push('Optimize critical rendering path and reduce render-blocking resources');
    }

    // Success rate
    const successRate = (summary.successfulPages / summary.totalPages) * 100;
    if (successRate < 100) {
      assessment.issues.push(`${summary.failedPages} pages failed to load (${(100-successRate).toFixed(1)}% failure rate)`);
      assessment.recommendations.push('Investigate and fix failing pages');
    }

    return assessment;
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new ManualPerformanceTester();
  tester.run().catch(console.error);
}

module.exports = ManualPerformanceTester;