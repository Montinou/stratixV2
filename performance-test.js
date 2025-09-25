#!/usr/bin/env node

/**
 * Performance Testing Suite for Migrated Pages
 * Tests page load times, API response times, and basic functionality
 */

const BASE_URL = 'http://localhost:3005';

// Pages to test based on migration scope
const PAGES_TO_TEST = [
  { name: 'Home', url: '/' },
  { name: 'Dashboard', url: '/dashboard' },
  { name: 'Initiatives', url: '/initiatives' },
  { name: 'Activities', url: '/activities' },
  { name: 'Companies', url: '/companies' },
  { name: 'Team', url: '/team' },
  { name: 'Profile', url: '/profile' },
  { name: 'Insights', url: '/insights' },
  { name: 'Import', url: '/import' },
  { name: 'Analytics', url: '/analytics' }
];

// API endpoints to test
const API_ENDPOINTS = [
  { name: 'Initiatives API', url: '/api/initiatives' },
  { name: 'Activities API', url: '/api/activities' },
  { name: 'Companies API', url: '/api/companies' },
  { name: 'Teams API', url: '/api/teams' },
  { name: 'Users API', url: '/api/users' },
  { name: 'Auth API', url: '/api/auth/session' }
];

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  pageLoad: 3000,        // 3 seconds
  apiResponse: 500,      // 500ms
  criticalApi: 200,      // 200ms for critical APIs
  totalBlockingTime: 300 // 300ms
};

class PerformanceTester {
  constructor() {
    this.results = {
      pageTests: [],
      apiTests: [],
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        averagePageLoad: 0,
        averageApiResponse: 0
      }
    };
  }

  async testPageLoad(page) {
    const url = `${BASE_URL}${page.url}`;
    console.log(`\n🧪 Testing page: ${page.name} (${url})`);
    
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Performance-Test-Suite/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      const result = {
        name: page.name,
        url: page.url,
        loadTime: Math.round(loadTime),
        status: response.status,
        success: response.ok && loadTime < PERFORMANCE_THRESHOLDS.pageLoad,
        threshold: PERFORMANCE_THRESHOLDS.pageLoad
      };
      
      this.results.pageTests.push(result);
      this.results.summary.totalTests++;
      
      if (result.success) {
        this.results.summary.passedTests++;
        console.log(`✅ ${page.name}: ${result.loadTime}ms (Status: ${response.status})`);
      } else {
        this.results.summary.failedTests++;
        console.log(`❌ ${page.name}: ${result.loadTime}ms (Status: ${response.status}) - SLOW`);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const result = {
        name: page.name,
        url: page.url,
        loadTime: Math.round(endTime - startTime),
        status: 'ERROR',
        success: false,
        error: error.message,
        threshold: PERFORMANCE_THRESHOLDS.pageLoad
      };
      
      this.results.pageTests.push(result);
      this.results.summary.totalTests++;
      this.results.summary.failedTests++;
      
      console.log(`💥 ${page.name}: ERROR - ${error.message}`);
      return result;
    }
  }

  async testApiEndpoint(endpoint) {
    const url = `${BASE_URL}${endpoint.url}`;
    console.log(`\n🔌 Testing API: ${endpoint.name} (${url})`);
    
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Performance-Test-Suite/1.0',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Determine threshold based on endpoint criticality
      const threshold = endpoint.url.includes('auth') ? 
        PERFORMANCE_THRESHOLDS.criticalApi : 
        PERFORMANCE_THRESHOLDS.apiResponse;
      
      const result = {
        name: endpoint.name,
        url: endpoint.url,
        responseTime: Math.round(responseTime),
        status: response.status,
        success: response.ok && responseTime < threshold,
        threshold: threshold
      };
      
      this.results.apiTests.push(result);
      this.results.summary.totalTests++;
      
      if (result.success) {
        this.results.summary.passedTests++;
        console.log(`✅ ${endpoint.name}: ${result.responseTime}ms (Status: ${response.status})`);
      } else {
        this.results.summary.failedTests++;
        console.log(`❌ ${endpoint.name}: ${result.responseTime}ms (Status: ${response.status}) - SLOW`);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const result = {
        name: endpoint.name,
        url: endpoint.url,
        responseTime: Math.round(endTime - startTime),
        status: 'ERROR',
        success: false,
        error: error.message,
        threshold: PERFORMANCE_THRESHOLDS.apiResponse
      };
      
      this.results.apiTests.push(result);
      this.results.summary.totalTests++;
      this.results.summary.failedTests++;
      
      console.log(`💥 ${endpoint.name}: ERROR - ${error.message}`);
      return result;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Performance Test Suite for Migrated Pages\n');
    console.log('📋 Performance Thresholds:');
    console.log(`   - Page Load Time: ${PERFORMANCE_THRESHOLDS.pageLoad}ms`);
    console.log(`   - API Response Time: ${PERFORMANCE_THRESHOLDS.apiResponse}ms`);
    console.log(`   - Critical API Response: ${PERFORMANCE_THRESHOLDS.criticalApi}ms`);
    console.log('\n' + '='.repeat(60));

    // Test all pages
    console.log('\n📄 TESTING PAGE LOAD TIMES');
    for (const page of PAGES_TO_TEST) {
      await this.testPageLoad(page);
      // Small delay between tests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Test all API endpoints  
    console.log('\n\n🔌 TESTING API RESPONSE TIMES');
    for (const endpoint of API_ENDPOINTS) {
      await this.testApiEndpoint(endpoint);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.generateSummary();
  }

  generateSummary() {
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));
    
    // Calculate averages
    const pageTimes = this.results.pageTests.map(t => t.loadTime).filter(t => !isNaN(t));
    const apiTimes = this.results.apiTests.map(t => t.responseTime).filter(t => !isNaN(t));
    
    this.results.summary.averagePageLoad = pageTimes.length > 0 ? 
      Math.round(pageTimes.reduce((a, b) => a + b, 0) / pageTimes.length) : 0;
    this.results.summary.averageApiResponse = apiTimes.length > 0 ?
      Math.round(apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length) : 0;

    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${this.results.summary.totalTests}`);
    console.log(`   ✅ Passed: ${this.results.summary.passedTests}`);
    console.log(`   ❌ Failed: ${this.results.summary.failedTests}`);
    console.log(`   📊 Success Rate: ${((this.results.summary.passedTests / this.results.summary.totalTests) * 100).toFixed(1)}%`);
    
    console.log(`\n⏱️  Performance Metrics:`);
    console.log(`   Average Page Load: ${this.results.summary.averagePageLoad}ms`);
    console.log(`   Average API Response: ${this.results.summary.averageApiResponse}ms`);

    // Show slowest pages/APIs
    const slowestPage = this.results.pageTests.reduce((prev, curr) => 
      (prev.loadTime > curr.loadTime) ? prev : curr, {loadTime: 0});
    const slowestApi = this.results.apiTests.reduce((prev, curr) => 
      (prev.responseTime > curr.responseTime) ? prev : curr, {responseTime: 0});

    if (slowestPage.loadTime > 0) {
      console.log(`   Slowest Page: ${slowestPage.name} (${slowestPage.loadTime}ms)`);
    }
    if (slowestApi.responseTime > 0) {
      console.log(`   Slowest API: ${slowestApi.name} (${slowestApi.responseTime}ms)`);
    }

    // Performance recommendations
    console.log(`\n💡 Recommendations:`);
    if (this.results.summary.averagePageLoad > PERFORMANCE_THRESHOLDS.pageLoad) {
      console.log(`   ⚠️  Page load times are above threshold - consider optimization`);
    }
    if (this.results.summary.averageApiResponse > PERFORMANCE_THRESHOLDS.apiResponse) {
      console.log(`   ⚠️  API response times are above threshold - review database queries`);
    }
    if (this.results.summary.failedTests > 0) {
      console.log(`   🔧 ${this.results.summary.failedTests} tests failed - review error logs above`);
    }
    if (this.results.summary.passedTests === this.results.summary.totalTests) {
      console.log(`   🎉 All tests passed! Performance is within acceptable thresholds`);
    }

    console.log('\n' + '='.repeat(60));
  }

  getResults() {
    return this.results;
  }
}

// Export for use as module or run directly
if (require.main === module) {
  const tester = new PerformanceTester();
  tester.runAllTests().catch(console.error);
}

module.exports = { PerformanceTester, PERFORMANCE_THRESHOLDS };