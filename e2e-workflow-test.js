#!/usr/bin/env node

/**
 * End-to-End Workflow Testing Suite for Migrated Pages
 * Simulates key user workflows as defined in the migration requirements
 */

const BASE_URL = 'http://localhost:3005';

// Key workflows from the task requirements
const USER_WORKFLOWS = [
  {
    name: 'OKR Manager Workflow',
    description: 'Login → View initiatives → Create initiative → Add activities → Edit → Delete',
    steps: [
      { name: 'View initiatives page', url: '/initiatives', method: 'GET', critical: true },
      { name: 'Check initiatives API', url: '/api/initiatives', method: 'GET', critical: true },
      { name: 'View activities page', url: '/activities', method: 'GET', critical: true },
      { name: 'Check activities API', url: '/api/activities', method: 'GET', critical: true }
    ],
    priority: 'critical'
  },
  {
    name: 'Company Admin Workflow', 
    description: 'Login → Manage companies → View team → Manage settings',
    steps: [
      { name: 'View companies page', url: '/companies', method: 'GET', critical: true },
      { name: 'Check companies API', url: '/api/companies', method: 'GET', critical: true },
      { name: 'View team page', url: '/team', method: 'GET', critical: true },
      { name: 'Check teams API', url: '/api/teams', method: 'GET', critical: true }
    ],
    priority: 'critical'
  },
  {
    name: 'Team Member Workflow',
    description: 'Login → View profile → Access insights → Import data', 
    steps: [
      { name: 'View profile page', url: '/profile', method: 'GET', critical: true },
      { name: 'View insights page', url: '/insights', method: 'GET', critical: false },
      { name: 'View import page', url: '/import', method: 'GET', critical: false },
      { name: 'Check users API', url: '/api/users', method: 'GET', critical: true }
    ],
    priority: 'high'
  },
  {
    name: 'Authentication & Navigation',
    description: 'Login/logout, session persistence, navigation',
    steps: [
      { name: 'Home page access', url: '/', method: 'GET', critical: true },
      { name: 'Dashboard access', url: '/dashboard', method: 'GET', critical: true },
      { name: 'Auth session check', url: '/api/auth/session', method: 'GET', critical: true },
      { name: 'Analytics page', url: '/analytics', method: 'GET', critical: false }
    ],
    priority: 'critical'
  }
];

// Performance and reliability thresholds
const WORKFLOW_THRESHOLDS = {
  stepTimeout: 5000,         // 5 seconds max per step
  workflowTimeout: 30000,    // 30 seconds max per workflow
  allowedFailures: 0,        // Critical workflows must have 0 failures
  avgResponseTime: 1000,     // 1 second average response time
  successRate: 95            // 95% success rate minimum
};

class E2EWorkflowTester {
  constructor() {
    this.results = {
      workflowResults: [],
      summary: {
        totalWorkflows: 0,
        completedWorkflows: 0,
        failedWorkflows: 0,
        criticalFailures: 0,
        totalSteps: 0,
        completedSteps: 0,
        avgWorkflowTime: 0,
        avgStepTime: 0,
        overallSuccessRate: 0
      },
      issues: [],
      recommendations: []
    };
  }

  async executeStep(step, workflowName) {
    const url = step.url.startsWith('/api') ? 
      `${BASE_URL}${step.url}` : 
      `${BASE_URL}${step.url}`;
      
    const startTime = Date.now();
    
    console.log(`   🔄 Executing: ${step.name}`);
    
    try {
      const response = await fetch(url, {
        method: step.method || 'GET',
        headers: {
          'Accept': step.url.startsWith('/api') ? 'application/json' : 'text/html,application/xhtml+xml',
          'User-Agent': 'E2E-Workflow-Tester/1.0'
        },
        timeout: WORKFLOW_THRESHOLDS.stepTimeout
      });
      
      const endTime = Date.now();
      const stepTime = endTime - startTime;
      
      const stepResult = {
        name: step.name,
        url: step.url,
        method: step.method || 'GET',
        status: response.status,
        success: response.ok,
        responseTime: stepTime,
        critical: step.critical,
        timestamp: new Date().toISOString()
      };

      // Additional validation for different step types
      if (step.url.startsWith('/api')) {
        // API endpoint validation
        try {
          const contentType = response.headers.get('content-type');
          stepResult.hasJsonResponse = contentType && contentType.includes('application/json');
          
          if (stepResult.hasJsonResponse && response.ok) {
            const data = await response.json();
            stepResult.hasData = data !== null && data !== undefined;
            stepResult.dataType = Array.isArray(data) ? 'array' : typeof data;
          }
        } catch (e) {
          stepResult.dataParsingError = e.message;
        }
      } else {
        // Page validation  
        const html = await response.text();
        stepResult.contentLength = html.length;
        stepResult.hasValidHtml = html.includes('<html') && html.includes('</html>');
        stepResult.hasContent = html.length > 1000; // Reasonable content threshold
        stepResult.hasNoErrors = !html.includes('Error') && !html.includes('500') && !html.includes('404');
      }
      
      // Performance evaluation
      stepResult.performanceRating = stepTime < 1000 ? 'excellent' :
                                    stepTime < 2000 ? 'good' :
                                    stepTime < 3000 ? 'acceptable' : 'poor';
      
      if (stepResult.success) {
        console.log(`   ✅ ${step.name}: ${stepTime}ms (${stepResult.performanceRating})`);
      } else {
        console.log(`   ❌ ${step.name}: Status ${response.status} after ${stepTime}ms`);
        
        if (step.critical) {
          this.results.issues.push({
            type: 'critical_step_failure',
            workflow: workflowName,
            step: step.name,
            status: response.status,
            message: `Critical step failed in ${workflowName} workflow`
          });
        }
      }
      
      return stepResult;
      
    } catch (error) {
      const endTime = Date.now();
      const stepResult = {
        name: step.name,
        url: step.url,
        method: step.method || 'GET',
        success: false,
        error: error.message,
        responseTime: endTime - startTime,
        critical: step.critical,
        timestamp: new Date().toISOString()
      };
      
      console.log(`   💥 ${step.name}: ${error.message}`);
      
      if (step.critical) {
        this.results.issues.push({
          type: 'critical_step_error',
          workflow: workflowName,
          step: step.name,
          error: error.message,
          message: `Critical step error in ${workflowName} workflow`
        });
      }
      
      return stepResult;
    }
  }

  async executeWorkflow(workflow) {
    console.log(`\n🏃‍♂️ Starting workflow: ${workflow.name}`);
    console.log(`📝 Description: ${workflow.description}`);
    
    const workflowStartTime = Date.now();
    const workflowResult = {
      name: workflow.name,
      description: workflow.description,
      priority: workflow.priority,
      steps: [],
      startTime: workflowStartTime,
      success: true,
      criticalStepsCompleted: 0,
      totalCriticalSteps: workflow.steps.filter(s => s.critical).length
    };
    
    // Execute all steps in sequence
    for (const step of workflow.steps) {
      this.results.summary.totalSteps++;
      
      const stepResult = await this.executeStep(step, workflow.name);
      workflowResult.steps.push(stepResult);
      
      if (stepResult.success) {
        this.results.summary.completedSteps++;
        if (step.critical) {
          workflowResult.criticalStepsCompleted++;
        }
      } else {
        workflowResult.success = false;
        if (step.critical) {
          workflowResult.hasCriticalFailure = true;
        }
      }
      
      // Small delay between steps to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const workflowEndTime = Date.now();
    workflowResult.duration = workflowEndTime - workflowStartTime;
    workflowResult.endTime = workflowEndTime;
    workflowResult.avgStepTime = workflowResult.steps.reduce((sum, step) => sum + (step.responseTime || 0), 0) / workflowResult.steps.length;
    workflowResult.successfulSteps = workflowResult.steps.filter(s => s.success).length;
    workflowResult.stepSuccessRate = (workflowResult.successfulSteps / workflowResult.steps.length) * 100;
    
    // Determine overall workflow success
    if (workflow.priority === 'critical') {
      workflowResult.success = workflowResult.criticalStepsCompleted === workflowResult.totalCriticalSteps;
      if (!workflowResult.success) {
        this.results.summary.criticalFailures++;
      }
    }
    
    this.results.workflowResults.push(workflowResult);
    this.results.summary.totalWorkflows++;
    
    if (workflowResult.success) {
      this.results.summary.completedWorkflows++;
      console.log(`✅ Workflow completed: ${workflowResult.successfulSteps}/${workflowResult.steps.length} steps (${workflowResult.duration}ms)`);
    } else {
      this.results.summary.failedWorkflows++;
      const criticalInfo = workflowResult.hasCriticalFailure ? ' (CRITICAL FAILURE)' : '';
      console.log(`❌ Workflow failed: ${workflowResult.successfulSteps}/${workflowResult.steps.length} steps${criticalInfo}`);
    }
    
    return workflowResult;
  }

  async runAllWorkflows() {
    console.log('🚀 Starting End-to-End Workflow Testing Suite\n');
    console.log('🎯 Testing Key User Workflows:');
    USER_WORKFLOWS.forEach(workflow => {
      console.log(`   - ${workflow.name} (${workflow.priority} priority)`);
    });
    console.log('\n' + '='.repeat(80));

    // Execute all workflows
    for (const workflow of USER_WORKFLOWS) {
      await this.executeWorkflow(workflow);
      
      // Brief pause between workflows
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.generateWorkflowReport();
  }

  generateWorkflowReport() {
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 END-TO-END WORKFLOW TEST REPORT');
    console.log('='.repeat(80));

    // Calculate summary metrics
    const totalTime = this.results.workflowResults.reduce((sum, w) => sum + w.duration, 0);
    this.results.summary.avgWorkflowTime = Math.round(totalTime / this.results.workflowResults.length);
    this.results.summary.avgStepTime = Math.round(
      this.results.workflowResults.reduce((sum, w) => sum + w.avgStepTime, 0) / this.results.workflowResults.length
    );
    this.results.summary.overallSuccessRate = (this.results.summary.completedSteps / this.results.summary.totalSteps) * 100;

    // Overall results
    console.log(`\n📈 Overall Results:`);
    console.log(`   Workflows: ${this.results.summary.completedWorkflows}/${this.results.summary.totalWorkflows} completed`);
    console.log(`   Steps: ${this.results.summary.completedSteps}/${this.results.summary.totalSteps} successful`);
    console.log(`   Success Rate: ${this.results.summary.overallSuccessRate.toFixed(1)}%`);
    console.log(`   Critical Failures: ${this.results.summary.criticalFailures}`);
    console.log(`   Average Workflow Time: ${this.results.summary.avgWorkflowTime}ms`);
    console.log(`   Average Step Time: ${this.results.summary.avgStepTime}ms`);

    // Workflow details
    console.log(`\n📋 Workflow Details:`);
    this.results.workflowResults.forEach(workflow => {
      const statusIcon = workflow.success ? '✅' : '❌';
      const criticalInfo = workflow.hasCriticalFailure ? ' (CRITICAL)' : '';
      console.log(`   ${statusIcon} ${workflow.name}: ${workflow.stepSuccessRate.toFixed(1)}% success, ${workflow.duration}ms${criticalInfo}`);
      
      // Show failed steps
      const failedSteps = workflow.steps.filter(s => !s.success);
      if (failedSteps.length > 0) {
        failedSteps.forEach(step => {
          const criticalMark = step.critical ? ' [CRITICAL]' : '';
          console.log(`      ❌ ${step.name}${criticalMark}: ${step.error || `Status ${step.status}`}`);
        });
      }
    });

    // Critical issues
    if (this.results.issues.length > 0) {
      console.log(`\n🚨 Critical Issues:`);
      this.results.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.workflow} - ${issue.step}: ${issue.message}`);
      });
    }

    // Performance analysis
    const slowWorkflows = this.results.workflowResults.filter(w => w.duration > 10000);
    const slowSteps = this.results.workflowResults
      .flatMap(w => w.steps)
      .filter(s => s.responseTime > 3000);

    if (slowWorkflows.length > 0 || slowSteps.length > 0) {
      console.log(`\n⏱️  Performance Concerns:`);
      slowWorkflows.forEach(w => {
        console.log(`   ⚠️  Slow workflow: ${w.name} (${w.duration}ms > 10000ms)`);
      });
      slowSteps.forEach(s => {
        console.log(`   ⚠️  Slow step: ${s.name} (${s.responseTime}ms > 3000ms)`);
      });
    }

    // Generate recommendations
    this.generateRecommendations();
    
    console.log(`\n💡 Recommendations:`);
    this.results.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });

    // Migration readiness assessment
    console.log(`\n🎯 Migration Readiness Assessment:`);
    if (this.results.summary.criticalFailures === 0 && this.results.summary.overallSuccessRate >= 95) {
      console.log(`   ✅ READY FOR PRODUCTION: All critical workflows functional`);
    } else if (this.results.summary.criticalFailures > 0) {
      console.log(`   ❌ NOT READY: ${this.results.summary.criticalFailures} critical workflow failures`);
    } else {
      console.log(`   ⚠️  PROCEED WITH CAUTION: ${this.results.summary.overallSuccessRate.toFixed(1)}% success rate`);
    }

    console.log('\n' + '='.repeat(80));
  }

  generateRecommendations() {
    this.results.recommendations = [];

    if (this.results.summary.criticalFailures > 0) {
      this.results.recommendations.push('🔧 Fix critical workflow failures before deployment');
    }

    if (this.results.summary.overallSuccessRate < 95) {
      this.results.recommendations.push('📈 Improve overall success rate to >95% for production readiness');
    }

    const apiIssues = this.results.issues.filter(i => i.step && i.step.includes('API'));
    if (apiIssues.length > 0) {
      this.results.recommendations.push('🔌 Review API endpoint functionality and error handling');
    }

    if (this.results.summary.avgStepTime > 2000) {
      this.results.recommendations.push('⚡ Optimize performance - average step time is slow');
    }

    const slowWorkflows = this.results.workflowResults.filter(w => w.duration > 10000);
    if (slowWorkflows.length > 0) {
      this.results.recommendations.push('🏃‍♂️ Optimize slow workflows for better user experience');
    }

    if (this.results.recommendations.length === 0) {
      this.results.recommendations.push('🎉 All workflows performing well - ready for deployment!');
    }
  }

  getResults() {
    return this.results;
  }
}

// Export for use as module or run directly
if (require.main === module) {
  const tester = new E2EWorkflowTester();
  tester.runAllWorkflows().catch(console.error);
}

module.exports = { E2EWorkflowTester };