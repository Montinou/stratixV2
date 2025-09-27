/**
 * Test script for OKR generation functionality
 * This script validates the OKR generation flow without requiring a full server setup
 */

import type {
  OKRGenerationRequest,
  OKRTemplateContext,
  Industry,
  CompanySize
} from '@/lib/types/ai'

// Mock the AI client for testing
const mockAIResponse = {
  templates: [
    {
      objective: {
        title: 'Mejorar la eficiencia del desarrollo de productos',
        description: 'Optimizar los procesos de desarrollo para acelerar la entrega manteniendo la calidad',
        category: 'Desarrollo de Producto',
        timeframe: 'quarterly' as const
      },
      keyResults: [
        {
          title: 'Reducir el tiempo de ciclo de desarrollo',
          description: 'Disminuir el tiempo promedio desde la concepción hasta el despliegue',
          target: '25%',
          measurementType: 'percentage' as const,
          baseline: 'Tiempo actual de ciclo',
          frequency: 'weekly' as const
        },
        {
          title: 'Aumentar la cobertura de tests automatizados',
          description: 'Incrementar la cobertura de pruebas para mejorar la calidad del código',
          target: '85%',
          measurementType: 'percentage' as const,
          frequency: 'weekly' as const
        }
      ],
      initiatives: [
        'Implementar CI/CD pipeline automatizado',
        'Establecer revisiones de código obligatorias'
      ],
      metrics: ['Tiempo de ciclo de desarrollo', 'Cobertura de tests'],
      risks: ['Resistencia al cambio del equipo', 'Curva de aprendizaje'],
      successCriteria: ['Entrega más rápida sin sacrificar calidad'],
      confidenceScore: 0.8,
      industryRelevance: 0.9
    }
  ]
}

/**
 * Test OKR generation with various industry contexts
 */
export async function testOKRGeneration() {
  console.log('🧪 Testing OKR Generation System...\n')

  const testCases: Array<{
    name: string
    context: OKRTemplateContext
    expectedChecks: string[]
  }> = [
    {
      name: 'Technology Startup',
      context: {
        industry: 'technology',
        companySize: 'startup',
        department: 'Engineering',
        role: 'corporativo',
        timeframe: 'quarterly',
        focusArea: 'Product Development',
        teamSize: 8,
        companyStage: 'early'
      },
      expectedChecks: [
        'Should include technology-specific metrics',
        'Should consider startup constraints',
        'Should have quarterly timeframe'
      ]
    },
    {
      name: 'Healthcare Medium Company',
      context: {
        industry: 'healthcare',
        companySize: 'medium',
        department: 'Operations',
        role: 'gerente',
        timeframe: 'annual',
        focusArea: 'Patient Care Quality',
        teamSize: 25,
        companyStage: 'growth'
      },
      expectedChecks: [
        'Should include patient care metrics',
        'Should consider compliance requirements',
        'Should have annual timeframe'
      ]
    },
    {
      name: 'Finance Enterprise',
      context: {
        industry: 'finance',
        companySize: 'enterprise',
        department: 'Risk Management',
        role: 'empleado',
        timeframe: 'quarterly',
        focusArea: 'Risk Mitigation',
        teamSize: 50,
        companyStage: 'mature'
      },
      expectedChecks: [
        'Should include financial risk metrics',
        'Should consider regulatory compliance',
        'Should be appropriate for enterprise scale'
      ]
    }
  ]

  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`)
    console.log(`   Industry: ${testCase.context.industry}`)
    console.log(`   Company Size: ${testCase.context.companySize}`)
    console.log(`   Department: ${testCase.context.department}`)
    console.log(`   Timeframe: ${testCase.context.timeframe}`)

    try {
      // Create generation request
      const request: OKRGenerationRequest = {
        context: testCase.context,
        numberOfTemplates: 2
      }

      // Simulate the generation process
      const result = await simulateOKRGeneration(request)

      console.log(`   ✅ Generated ${result.templates.length} template(s)`)
      console.log(`   📊 Quality Score: ${(result.qualityScore * 100).toFixed(1)}%`)
      console.log(`   ⏱️  Processing Time: ${result.metadata.processingTime}ms`)

      // Validate results
      const validation = validateTestResults(result, testCase)
      if (validation.success) {
        console.log('   ✅ All validations passed')
      } else {
        console.log('   ❌ Some validations failed:', validation.errors)
      }

    } catch (error) {
      console.log(`   ❌ Test failed:`, error)
    }

    console.log('')
  }

  console.log('🏁 OKR Generation Testing Complete!\n')
}

/**
 * Simulate OKR generation for testing
 */
async function simulateOKRGeneration(request: OKRGenerationRequest) {
  const startTime = Date.now()

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100))

  // Generate contextual response based on request
  const templates = generateMockTemplates(request.context, request.numberOfTemplates || 1)

  return {
    templates,
    metadata: {
      generatedAt: new Date(),
      model: 'test-model',
      provider: 'test',
      requestId: 'test-' + Date.now(),
      processingTime: Date.now() - startTime
    },
    qualityScore: 0.85,
    suggestions: ['Consider adding more specific metrics', 'Review timeline feasibility']
  }
}

/**
 * Generate mock templates based on context
 */
function generateMockTemplates(context: OKRTemplateContext, count: number) {
  const templates = []

  for (let i = 0; i < count; i++) {
    const template = {
      objective: {
        title: generateContextualTitle(context),
        description: generateContextualDescription(context),
        category: context.department || 'General',
        timeframe: context.timeframe || 'quarterly'
      },
      keyResults: generateContextualKeyResults(context),
      initiatives: generateContextualInitiatives(context),
      metrics: generateContextualMetrics(context),
      risks: generateContextualRisks(context),
      successCriteria: ['Achieve target metrics', 'Maintain quality standards'],
      confidenceScore: 0.8 + (Math.random() * 0.15),
      industryRelevance: 0.85 + (Math.random() * 0.1)
    }

    templates.push(template)
  }

  return templates
}

function generateContextualTitle(context: OKRTemplateContext): string {
  const industryActions = {
    technology: ['Accelerate', 'Optimize', 'Scale', 'Innovate'],
    healthcare: ['Improve', 'Enhance', 'Ensure', 'Deliver'],
    finance: ['Increase', 'Reduce', 'Optimize', 'Strengthen'],
    retail: ['Boost', 'Expand', 'Enhance', 'Drive'],
    general: ['Improve', 'Enhance', 'Optimize', 'Achieve']
  }

  const actions = industryActions[context.industry] || industryActions.general
  const action = actions[Math.floor(Math.random() * actions.length)]

  const focuses = {
    technology: 'product development efficiency',
    healthcare: 'patient care quality',
    finance: 'risk management processes',
    retail: 'customer satisfaction',
    general: 'operational efficiency'
  }

  const focus = focuses[context.industry] || focuses.general

  return `${action} ${focus}`
}

function generateContextualDescription(context: OKRTemplateContext): string {
  const descriptions = {
    technology: 'Streamline development processes to deliver high-quality products faster',
    healthcare: 'Enhance patient care through improved processes and quality measures',
    finance: 'Strengthen risk management capabilities while maintaining regulatory compliance',
    retail: 'Improve customer experience and satisfaction across all touchpoints',
    general: 'Optimize operational processes to achieve better outcomes'
  }

  return descriptions[context.industry] || descriptions.general
}

function generateContextualKeyResults(context: OKRTemplateContext) {
  const industryMetrics = {
    technology: [
      { title: 'Reduce deployment time', target: '50%', type: 'percentage' },
      { title: 'Increase code coverage', target: '90%', type: 'percentage' },
      { title: 'Decrease bug reports', target: '30%', type: 'percentage' }
    ],
    healthcare: [
      { title: 'Improve patient satisfaction', target: '4.5/5', type: 'number' },
      { title: 'Reduce wait times', target: '20%', type: 'percentage' },
      { title: 'Increase safety compliance', target: '98%', type: 'percentage' }
    ],
    finance: [
      { title: 'Reduce operational risk', target: '25%', type: 'percentage' },
      { title: 'Improve processing time', target: '30%', type: 'percentage' },
      { title: 'Maintain compliance rate', target: '100%', type: 'percentage' }
    ]
  }

  const defaultMetrics = [
    { title: 'Improve efficiency', target: '20%', type: 'percentage' },
    { title: 'Increase satisfaction', target: '4.0/5', type: 'number' }
  ]

  const metrics = industryMetrics[context.industry] || defaultMetrics

  return metrics.slice(0, 3).map(metric => ({
    title: metric.title,
    description: `${metric.title} through process optimization`,
    target: metric.target,
    measurementType: metric.type as 'percentage' | 'number',
    frequency: 'monthly' as const
  }))
}

function generateContextualInitiatives(context: OKRTemplateContext): string[] {
  const industryInitiatives = {
    technology: [
      'Implement automated testing pipeline',
      'Adopt agile development methodologies',
      'Enhance code review processes'
    ],
    healthcare: [
      'Implement patient feedback system',
      'Enhance staff training programs',
      'Optimize appointment scheduling'
    ],
    finance: [
      'Deploy risk monitoring dashboard',
      'Enhance compliance training',
      'Automate reporting processes'
    ]
  }

  const defaultInitiatives = [
    'Establish process improvement team',
    'Implement performance monitoring',
    'Enhance team training'
  ]

  return industryInitiatives[context.industry] || defaultInitiatives
}

function generateContextualMetrics(context: OKRTemplateContext): string[] {
  const industryMetrics = {
    technology: ['Deployment frequency', 'Code quality score', 'Bug fix time'],
    healthcare: ['Patient satisfaction score', 'Wait time', 'Safety incidents'],
    finance: ['Risk score', 'Compliance rate', 'Processing time']
  }

  return industryMetrics[context.industry] || ['Efficiency rate', 'Quality score', 'Satisfaction rating']
}

function generateContextualRisks(context: OKRTemplateContext): string[] {
  const industryRisks = {
    technology: ['Technical debt accumulation', 'Resource constraints'],
    healthcare: ['Compliance violations', 'Staff resistance'],
    finance: ['Regulatory changes', 'Market volatility']
  }

  return industryRisks[context.industry] || ['Resource limitations', 'Timeline constraints']
}

/**
 * Validate test results
 */
function validateTestResults(
  result: any,
  testCase: { name: string; context: OKRTemplateContext; expectedChecks: string[] }
): { success: boolean; errors: string[] } {
  const errors: string[] = []

  // Check basic structure
  if (!result.templates || !Array.isArray(result.templates)) {
    errors.push('Result must contain templates array')
  }

  if (result.templates.length === 0) {
    errors.push('Must generate at least one template')
  }

  // Check template structure
  for (const template of result.templates) {
    if (!template.objective || !template.objective.title) {
      errors.push('Template must have objective with title')
    }

    if (!template.keyResults || !Array.isArray(template.keyResults)) {
      errors.push('Template must have keyResults array')
    }

    if (template.keyResults.length < 2) {
      errors.push('Template should have at least 2 key results')
    }

    if (!template.initiatives || !Array.isArray(template.initiatives)) {
      errors.push('Template must have initiatives array')
    }
  }

  // Check context alignment
  const templateText = JSON.stringify(result.templates).toLowerCase()

  // Industry-specific validation
  if (testCase.context.industry === 'technology') {
    if (!templateText.includes('development') && !templateText.includes('tech')) {
      errors.push('Technology context should include relevant terminology')
    }
  }

  if (testCase.context.industry === 'healthcare') {
    if (!templateText.includes('patient') && !templateText.includes('care')) {
      errors.push('Healthcare context should include relevant terminology')
    }
  }

  // Check timeframe alignment
  for (const template of result.templates) {
    if (template.objective.timeframe !== testCase.context.timeframe) {
      errors.push(`Timeframe should match context: expected ${testCase.context.timeframe}`)
    }
  }

  return {
    success: errors.length === 0,
    errors
  }
}

// Export test function for external use
export { testOKRGeneration as default }