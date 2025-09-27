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
  ],
  userAgents: {
    chrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    firefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
    safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Version/17.0 Safari/537.36',
    edge: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
  },
  viewports: [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 667 }
  ]
};

class CrossBrowserTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      browsers: {},
      summary: {}
    };
  }

  async run() {
    console.log('🌐 Cross-Browser Compatibility Testing');
    console.log('=====================================');
    
    await this.testBrowserCompatibility();
    await this.generateReport();
    
    console.log('✅ Cross-browser testing completed!');
  }

  async testBrowserCompatibility() {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    for (const [browserName, userAgent] of Object.entries(config.userAgents)) {
      console.log(`\n🔍 Testing ${browserName.toUpperCase()} compatibility...`);
      this.results.browsers[browserName] = { pages: {}, issues: [] };

      for (const pagePath of config.testPages) {
        const url = `${config.baseUrl}${pagePath}`;
        console.log(`   Testing: ${url}`);
        
        try {
          const page = await browser.newPage();
          await page.setUserAgent(userAgent);
          
          // Test different viewports
          for (const viewport of config.viewports) {
            await page.setViewport(viewport);
            
            const startTime = Date.now();
            const response = await page.goto(url, { 
              waitUntil: 'networkidle0',
              timeout: 30000 
            });
            const loadTime = Date.now() - startTime;

            // Check for console errors
            const consoleErrors = [];
            page.on('console', msg => {
              if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
              }
            });

            // Check for JavaScript errors
            const jsErrors = [];
            page.on('pageerror', error => {
              jsErrors.push(error.message);
            });

            // Get page performance and compatibility info
            const compatibility = await page.evaluate(() => {
              const results = {
                features: {},
                cssSupport: {},
                jsAPIs: {},
                responsive: {}
              };

              // Test modern JS features
              results.features.es6Support = typeof Promise !== 'undefined';
              results.features.asyncAwait = typeof (async () => {}) === 'function';
              results.features.fetchAPI = typeof fetch !== 'undefined';
              results.features.localStorage = typeof localStorage !== 'undefined';
              results.features.sessionStorage = typeof sessionStorage !== 'undefined';

              // Test CSS features
              const testDiv = document.createElement('div');
              document.body.appendChild(testDiv);
              
              results.cssSupport.flexbox = testDiv.style.display === '' && 
                (testDiv.style.display = 'flex', testDiv.style.display === 'flex');
              results.cssSupport.grid = testDiv.style.display === '' && 
                (testDiv.style.display = 'grid', testDiv.style.display === 'grid');
              results.cssSupport.customProperties = CSS.supports('color', 'var(--test)');
              
              document.body.removeChild(testDiv);

              // Test Web APIs
              results.jsAPIs.intersectionObserver = 'IntersectionObserver' in window;
              results.jsAPIs.performanceObserver = 'PerformanceObserver' in window;
              results.jsAPIs.resizeObserver = 'ResizeObserver' in window;
              results.jsAPIs.webWorkers = 'Worker' in window;

              // Test responsive design
              results.responsive.viewport = {
                width: window.innerWidth,
                height: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio || 1
              };

              return results;
            });

            // Store results for this page/browser/viewport combination
            const key = `${pagePath}_${viewport.name}`;
            this.results.browsers[browserName].pages[key] = {
              url,
              viewport: viewport.name,
              loadTime,
              status: response.status(),
              compatibility,
              consoleErrors,
              jsErrors,
              success: response.ok() && jsErrors.length === 0
            };

            console.log(`     ${viewport.name}: ${response.status()} | ${loadTime}ms | Errors: ${jsErrors.length}`);
          }

          await page.close();
          
        } catch (error) {
          console.error(`     ❌ Failed to test ${pagePath}:`, error.message);
          this.results.browsers[browserName].issues.push({
            page: pagePath,
            error: error.message
          });
        }
      }
    }

    await browser.close();
  }

  async generateReport() {
    console.log('\n📋 Analyzing Cross-Browser Compatibility...');
    
    // Analyze compatibility issues
    this.analyzeCompatibility();
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = `./performance-results/cross-browser-${timestamp}.json`;
    
    await fs.writeFile(resultsFile, JSON.stringify(this.results, null, 2));
    console.log(`   📁 Results saved to: ${resultsFile}`);
    
    this.printSummary();
  }

  analyzeCompatibility() {
    const summary = {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      compatibilityIssues: [],
      browserScores: {},
      overallScore: 0
    };

    Object.entries(this.results.browsers).forEach(([browserName, browserData]) => {
      const pageTests = Object.values(browserData.pages);
      const successful = pageTests.filter(t => t.success).length;
      const total = pageTests.length;
      
      summary.totalTests += total;
      summary.successfulTests += successful;
      summary.failedTests += (total - successful);
      
      summary.browserScores[browserName] = {
        score: total > 0 ? (successful / total) * 100 : 0,
        successful,
        total,
        issues: browserData.issues.length
      };

      // Check for common compatibility issues
      pageTests.forEach(test => {
        if (test.jsErrors?.length > 0) {
          summary.compatibilityIssues.push({
            browser: browserName,
            page: test.url,
            viewport: test.viewport,
            type: 'JavaScript Error',
            details: test.jsErrors
          });
        }

        if (test.consoleErrors?.length > 0) {
          summary.compatibilityIssues.push({
            browser: browserName,
            page: test.url,
            viewport: test.viewport,
            type: 'Console Error',
            details: test.consoleErrors
          });
        }

        // Check for missing feature support
        const compat = test.compatibility;
        if (compat) {
          if (!compat.features?.fetchAPI) {
            summary.compatibilityIssues.push({
              browser: browserName,
              page: test.url,
              viewport: test.viewport,
              type: 'Missing API',
              details: 'Fetch API not supported'
            });
          }

          if (!compat.cssSupport?.flexbox) {
            summary.compatibilityIssues.push({
              browser: browserName,
              page: test.url,
              viewport: test.viewport,
              type: 'CSS Feature',
              details: 'Flexbox not supported'
            });
          }
        }
      });
    });

    // Calculate overall score
    summary.overallScore = summary.totalTests > 0 
      ? (summary.successfulTests / summary.totalTests) * 100 
      : 0;

    this.results.summary = summary;
  }

  printSummary() {
    const summary = this.results.summary;
    
    console.log('\n' + '='.repeat(60));
    console.log('🌐 CROSS-BROWSER COMPATIBILITY SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`Overall Compatibility Score: ${summary.overallScore.toFixed(1)}%`);
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Successful: ${summary.successfulTests} | Failed: ${summary.failedTests}`);
    console.log('');
    
    console.log('📊 Browser Scores:');
    Object.entries(summary.browserScores).forEach(([browser, score]) => {
      console.log(`   ${browser.toUpperCase().padEnd(10)}: ${score.score.toFixed(1)}% (${score.successful}/${score.total} tests passed)`);
    });
    
    if (summary.compatibilityIssues.length > 0) {
      console.log('\n🚨 Compatibility Issues Found:');
      const groupedIssues = this.groupIssuesByType(summary.compatibilityIssues);
      
      Object.entries(groupedIssues).forEach(([type, issues]) => {
        console.log(`   ${type}: ${issues.length} issue(s)`);
        issues.slice(0, 3).forEach(issue => {
          console.log(`     - ${issue.browser}: ${issue.details[0] || issue.details}`);
        });
        if (issues.length > 3) {
          console.log(`     ... and ${issues.length - 3} more`);
        }
      });
    } else {
      console.log('\n✅ No compatibility issues found!');
    }
    
    console.log('\n💡 Recommendations:');
    if (summary.overallScore >= 95) {
      console.log('   1. Excellent cross-browser compatibility!');
    } else if (summary.overallScore >= 80) {
      console.log('   1. Good compatibility with minor issues to address');
      console.log('   2. Test on real devices for validation');
    } else {
      console.log('   1. Address critical compatibility issues');
      console.log('   2. Implement polyfills for missing features');
      console.log('   3. Test thoroughly on target browsers');
    }
    
    console.log('='.repeat(60));
  }

  groupIssuesByType(issues) {
    return issues.reduce((groups, issue) => {
      const type = issue.type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(issue);
      return groups;
    }, {});
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new CrossBrowserTester();
  tester.run().catch(console.error);
}

module.exports = CrossBrowserTester;