#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;

const config = {
  baseUrl: 'http://localhost:3007',
  testPages: [
    '/',
    '/dashboard',
    '/objectives',
    '/initiatives',
    '/activities'
  ]
};

class CoreWebVitalsTest {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      pages: {},
      summary: {}
    };
  }

  async run() {
    console.log('🔍 Testing Core Web Vitals');
    console.log('==========================');
    
    await this.testCoreWebVitals();
    await this.generateReport();
    
    console.log('✅ Core Web Vitals testing completed!');
  }

  async testCoreWebVitals() {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    for (const pagePath of config.testPages) {
      const url = `${config.baseUrl}${pagePath}`;
      console.log(`   Testing: ${url}`);
      
      try {
        const page = await browser.newPage();
        
        // Navigate to page and wait for load
        const startTime = Date.now();
        await page.goto(url, { waitUntil: 'networkidle0' });
        const pageLoadTime = Date.now() - startTime;
        
        // Get Core Web Vitals using PerformanceObserver
        const vitals = await page.evaluate(() => {
          return new Promise((resolve) => {
            const vitals = {};
            let resolved = false;
            
            // Timeout after 10 seconds
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                resolve(vitals);
              }
            }, 10000);
            
            // Try to get LCP
            if ('PerformanceObserver' in window) {
              try {
                const lcpObserver = new PerformanceObserver((entryList) => {
                  const entries = entryList.getEntries();
                  const lastEntry = entries[entries.length - 1];
                  vitals.LCP = lastEntry.startTime;
                });
                lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
              } catch (e) {
                console.log('LCP observation failed:', e);
              }

              // Try to get FID
              try {
                const fidObserver = new PerformanceObserver((entryList) => {
                  const entries = entryList.getEntries();
                  entries.forEach(entry => {
                    if (entry.processingStart && entry.startTime) {
                      vitals.FID = entry.processingStart - entry.startTime;
                    }
                  });
                });
                fidObserver.observe({ type: 'first-input', buffered: true });
              } catch (e) {
                console.log('FID observation failed:', e);
              }

              // Try to get CLS
              try {
                const clsObserver = new PerformanceObserver((entryList) => {
                  let clsValue = 0;
                  const entries = entryList.getEntries();
                  entries.forEach(entry => {
                    if (!entry.hadRecentInput) {
                      clsValue += entry.value;
                    }
                  });
                  vitals.CLS = clsValue;
                });
                clsObserver.observe({ type: 'layout-shift', buffered: true });
              } catch (e) {
                console.log('CLS observation failed:', e);
              }
            }

            // Get paint timing
            const paintEntries = performance.getEntriesByType('paint');
            paintEntries.forEach(entry => {
              if (entry.name === 'first-contentful-paint') {
                vitals.FCP = entry.startTime;
              }
              if (entry.name === 'first-paint') {
                vitals.FP = entry.startTime;
              }
            });

            // Get navigation timing
            const navEntries = performance.getEntriesByType('navigation');
            if (navEntries.length > 0) {
              const nav = navEntries[0];
              vitals.TTFB = nav.responseStart - nav.requestStart;
              vitals.domInteractive = nav.domInteractive - nav.navigationStart;
              vitals.domComplete = nav.domComplete - nav.navigationStart;
              vitals.loadComplete = nav.loadEventEnd - nav.navigationStart;
            }

            // Return results after a short delay to capture metrics
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                resolve(vitals);
              }
            }, 3000);
          });
        });

        // Get additional performance metrics
        const performanceMetrics = await page.metrics();

        this.results.pages[pagePath] = {
          url,
          loadTime: pageLoadTime,
          coreWebVitals: {
            LCP: vitals.LCP || 0,
            FID: vitals.FID || 0,
            CLS: vitals.CLS || 0,
            FCP: vitals.FCP || 0,
            FP: vitals.FP || 0,
            TTFB: vitals.TTFB || 0
          },
          timing: {
            domInteractive: vitals.domInteractive || 0,
            domComplete: vitals.domComplete || 0,
            loadComplete: vitals.loadComplete || 0
          },
          performance: {
            JSHeapUsedSize: performanceMetrics.JSHeapUsedSize,
            JSHeapTotalSize: performanceMetrics.JSHeapTotalSize,
            LayoutDuration: performanceMetrics.LayoutDuration,
            ScriptDuration: performanceMetrics.ScriptDuration
          }
        };

        const cwv = this.results.pages[pagePath].coreWebVitals;
        console.log(`     LCP: ${cwv.LCP.toFixed(0)}ms | FCP: ${cwv.FCP.toFixed(0)}ms | CLS: ${cwv.CLS.toFixed(3)} | TTFB: ${cwv.TTFB.toFixed(0)}ms`);

        await page.close();
        
      } catch (error) {
        console.error(`     ❌ Failed to test ${pagePath}:`, error.message);
        this.results.pages[pagePath] = { error: error.message };
      }
    }

    await browser.close();
  }

  async generateReport() {
    console.log('\n📋 Analyzing Core Web Vitals Results...');
    
    const pageResults = Object.values(this.results.pages).filter(p => p.coreWebVitals);
    
    if (pageResults.length > 0) {
      // Calculate averages
      const avgMetrics = {
        LCP: pageResults.reduce((sum, p) => sum + p.coreWebVitals.LCP, 0) / pageResults.length,
        FCP: pageResults.reduce((sum, p) => sum + p.coreWebVitals.FCP, 0) / pageResults.length,
        CLS: pageResults.reduce((sum, p) => sum + p.coreWebVitals.CLS, 0) / pageResults.length,
        TTFB: pageResults.reduce((sum, p) => sum + p.coreWebVitals.TTFB, 0) / pageResults.length,
        loadTime: pageResults.reduce((sum, p) => sum + p.loadTime, 0) / pageResults.length
      };

      this.results.summary = {
        totalPages: pageResults.length,
        averages: avgMetrics,
        assessment: this.assessCoreWebVitals(avgMetrics)
      };
    }
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = `./performance-results/core-web-vitals-${timestamp}.json`;
    
    await fs.writeFile(resultsFile, JSON.stringify(this.results, null, 2));
    console.log(`   📁 Results saved to: ${resultsFile}`);
    
    this.printSummary();
  }

  assessCoreWebVitals(metrics) {
    const assessment = {
      overall: 'GOOD',
      scores: {},
      issues: [],
      recommendations: []
    };

    // Assess LCP (Largest Contentful Paint)
    if (metrics.LCP <= 2500) {
      assessment.scores.LCP = 'GOOD';
    } else if (metrics.LCP <= 4000) {
      assessment.scores.LCP = 'NEEDS_IMPROVEMENT';
      assessment.overall = 'NEEDS_IMPROVEMENT';
      assessment.issues.push(`LCP (${metrics.LCP.toFixed(0)}ms) exceeds 2.5s threshold`);
    } else {
      assessment.scores.LCP = 'POOR';
      assessment.overall = 'POOR';
      assessment.issues.push(`LCP (${metrics.LCP.toFixed(0)}ms) is poor (>4s)`);
      assessment.recommendations.push('Optimize largest content elements, implement lazy loading, optimize images');
    }

    // Assess FCP (First Contentful Paint)
    if (metrics.FCP <= 1800) {
      assessment.scores.FCP = 'GOOD';
    } else if (metrics.FCP <= 3000) {
      assessment.scores.FCP = 'NEEDS_IMPROVEMENT';
      if (assessment.overall === 'GOOD') assessment.overall = 'NEEDS_IMPROVEMENT';
      assessment.issues.push(`FCP (${metrics.FCP.toFixed(0)}ms) exceeds 1.8s threshold`);
    } else {
      assessment.scores.FCP = 'POOR';
      assessment.overall = 'POOR';
      assessment.issues.push(`FCP (${metrics.FCP.toFixed(0)}ms) is poor (>3s)`);
      assessment.recommendations.push('Optimize critical rendering path, reduce render-blocking resources');
    }

    // Assess CLS (Cumulative Layout Shift)
    if (metrics.CLS <= 0.1) {
      assessment.scores.CLS = 'GOOD';
    } else if (metrics.CLS <= 0.25) {
      assessment.scores.CLS = 'NEEDS_IMPROVEMENT';
      if (assessment.overall === 'GOOD') assessment.overall = 'NEEDS_IMPROVEMENT';
      assessment.issues.push(`CLS (${metrics.CLS.toFixed(3)}) exceeds 0.1 threshold`);
    } else {
      assessment.scores.CLS = 'POOR';
      assessment.overall = 'POOR';
      assessment.issues.push(`CLS (${metrics.CLS.toFixed(3)}) is poor (>0.25)`);
      assessment.recommendations.push('Fix layout shifts, set dimensions for images and embeds');
    }

    // Assess TTFB (Time to First Byte)
    if (metrics.TTFB <= 800) {
      assessment.scores.TTFB = 'GOOD';
    } else if (metrics.TTFB <= 1800) {
      assessment.scores.TTFB = 'NEEDS_IMPROVEMENT';
      if (assessment.overall === 'GOOD') assessment.overall = 'NEEDS_IMPROVEMENT';
      assessment.issues.push(`TTFB (${metrics.TTFB.toFixed(0)}ms) exceeds 800ms threshold`);
    } else {
      assessment.scores.TTFB = 'POOR';
      assessment.overall = 'POOR';
      assessment.issues.push(`TTFB (${metrics.TTFB.toFixed(0)}ms) is poor (>1.8s)`);
      assessment.recommendations.push('Optimize server response time, implement caching, optimize database queries');
    }

    return assessment;
  }

  printSummary() {
    const summary = this.results.summary;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 CORE WEB VITALS SUMMARY');
    console.log('='.repeat(60));
    
    if (summary && summary.averages) {
      console.log(`Overall Assessment: ${summary.assessment.overall}`);
      console.log('');
      console.log('📊 Core Web Vitals:');
      console.log(`   LCP (Largest Contentful Paint): ${summary.averages.LCP.toFixed(0)}ms [${summary.assessment.scores.LCP}]`);
      console.log(`   FCP (First Contentful Paint):   ${summary.averages.FCP.toFixed(0)}ms [${summary.assessment.scores.FCP}]`);
      console.log(`   CLS (Cumulative Layout Shift):  ${summary.averages.CLS.toFixed(3)} [${summary.assessment.scores.CLS}]`);
      console.log(`   TTFB (Time to First Byte):      ${summary.averages.TTFB.toFixed(0)}ms [${summary.assessment.scores.TTFB}]`);
      console.log('');
      console.log(`📈 Additional Metrics:`);
      console.log(`   Average Page Load Time: ${summary.averages.loadTime.toFixed(0)}ms`);
      console.log(`   Pages Tested: ${summary.totalPages}`);
      
      if (summary.assessment.issues.length > 0) {
        console.log('\n🚨 Issues Found:');
        summary.assessment.issues.forEach((issue, i) => {
          console.log(`   ${i + 1}. ${issue}`);
        });
      }
      
      if (summary.assessment.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        summary.assessment.recommendations.forEach((rec, i) => {
          console.log(`   ${i + 1}. ${rec}`);
        });
      }
    } else {
      console.log('❌ No Core Web Vitals data collected');
    }
    
    console.log('='.repeat(60));
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new CoreWebVitalsTest();
  tester.run().catch(console.error);
}

module.exports = CoreWebVitalsTest;