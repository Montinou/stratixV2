import { describe, test, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { conversationManager } from '../conversation-manager'
import { chatContextBuilder } from '../chat-context'
import { conversationStorage } from '../conversation-storage'
// Removed import of deleted chat-session-manager - using native auth only
import { OKRKnowledgeBase } from '../okr-knowledge-base'
import type { UserContext, OKRContext } from '../conversation-manager'
import type { Activity } from '@/lib/database/queries/activities'

// Mock external dependencies
vi.mock('@/lib/database/neon-client', () => ({
  createClient: () => ({
    query: vi.fn().mockResolvedValue({ rows: [] })
  })
}))

vi.mock('@/lib/database/queries/profiles', () => ({
  getProfileById: vi.fn().mockResolvedValue({
    id: 'test-user-id',
    name: 'Test User',
    role: 'gerente',
    department: 'Engineering',
    company_name: 'Test Company',
    industry: 'Tecnología'
  })
}))

vi.mock('@/lib/database/queries/activities', () => ({
  getRecentUserActivities: vi.fn().mockResolvedValue([
    {
      id: 'activity-1',
      type: 'progress_update',
      description: 'Updated OKR progress',
      created_at: new Date()
    }
  ])
}))

// Test data fixtures
const mockUserContext: UserContext = {
  userId: 'test-user-id',
  role: 'gerente',
  profile: {
    id: 'test-user-id',
    name: 'Test User',
    role: 'gerente',
    department: 'Engineering',
    company_name: 'Test Company',
    industry: 'Tecnología'
  } as any,
  department: 'Engineering',
  companySize: 'pyme',
  preferences: {
    language: 'es',
    communicationStyle: 'formal',
    detailLevel: 'detailed'
  }
}

const mockOKRContext: OKRContext[] = [
  {
    id: 'okr-1',
    title: 'Mejorar la experiencia del usuario',
    type: 'objective',
    status: 'on_track',
    progress: 65,
    deadline: new Date('2024-12-31'),
    owner: 'Test User',
    department: 'Engineering'
  },
  {
    id: 'kr-1',
    title: 'Aumentar NPS a 8.5',
    type: 'key_result',
    status: 'at_risk',
    progress: 45,
    deadline: new Date('2024-12-31'),
    owner: 'Test User',
    department: 'Engineering'
  }
]

const mockActivity: Activity[] = [
  {
    id: 'activity-1',
    type: 'progress_update',
    description: 'Updated OKR progress to 65%',
    created_at: new Date(),
    user_id: 'test-user-id'
  } as Activity
]

describe('Conversation Manager', () => {
  beforeEach(() => {
    // Clear conversation manager state
    conversationManager['conversations'].clear()
    conversationManager['summaries'].clear()
  })

  test('should initialize conversation with context', async () => {
    const conversationId = 'test-conv-1'

    const context = await conversationManager.initializeConversation(
      conversationId,
      mockUserContext,
      mockOKRContext,
      mockActivity
    )

    expect(context.conversationId).toBe(conversationId)
    expect(context.userContext.userId).toBe('test-user-id')
    expect(context.okrContext).toHaveLength(2)
    expect(context.activityContext).toHaveLength(1)
    expect(context.sessionMetadata.messageCount).toBe(0)
  })

  test('should add messages and track conversation history', async () => {
    const conversationId = 'test-conv-2'

    await conversationManager.initializeConversation(
      conversationId,
      mockUserContext,
      mockOKRContext,
      mockActivity
    )

    const userMessage = {
      role: 'user' as const,
      content: '¿Cómo puedo mejorar el progreso de mis OKRs?'
    }

    const updatedContext = await conversationManager.addMessage(
      conversationId,
      userMessage
    )

    expect(updatedContext.conversationHistory).toHaveLength(1)
    expect(updatedContext.sessionMetadata.messageCount).toBe(1)
    expect(updatedContext.sessionMetadata.topics).toContain('progreso')
  })

  test('should build system prompt with context', () => {
    const conversationId = 'test-conv-3'
    conversationManager['conversations'].set(conversationId, {
      conversationId,
      userContext: mockUserContext,
      okrContext: mockOKRContext,
      activityContext: mockActivity,
      conversationHistory: [],
      sessionMetadata: {
        startTime: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        topics: ['objetivos', 'progreso']
      }
    })

    const aiContext = conversationManager.getContextForAI(conversationId)

    expect(aiContext.systemPrompt).toContain('gerente')
    expect(aiContext.systemPrompt).toContain('Engineering')
    expect(aiContext.systemPrompt).toContain('pyme')
    expect(aiContext.messages).toEqual([])
    expect(aiContext.metadata.currentOKRCount).toBe(2)
  })

  test('should handle conversation cleanup', () => {
    // Create some old conversations
    const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago

    conversationManager['conversations'].set('old-conv', {
      conversationId: 'old-conv',
      userContext: mockUserContext,
      okrContext: [],
      activityContext: [],
      conversationHistory: [],
      sessionMetadata: {
        startTime: oldTime,
        lastActivity: oldTime,
        messageCount: 5,
        topics: []
      }
    })

    conversationManager['conversations'].set('recent-conv', {
      conversationId: 'recent-conv',
      userContext: mockUserContext,
      okrContext: [],
      activityContext: [],
      conversationHistory: [],
      sessionMetadata: {
        startTime: new Date(),
        lastActivity: new Date(),
        messageCount: 2,
        topics: []
      }
    })

    const cleaned = conversationManager.cleanupIdleConversations()

    expect(cleaned).toBe(1)
    expect(conversationManager['conversations'].has('old-conv')).toBe(false)
    expect(conversationManager['conversations'].has('recent-conv')).toBe(true)
  })
})

describe('Chat Context Builder', () => {
  test('should build comprehensive chat context', async () => {
    const context = await chatContextBuilder.buildChatContext({
      userId: 'test-user-id',
      conversationId: 'test-conv',
      currentOKRs: mockOKRContext,
      recentActivity: mockActivity,
      preferences: {
        language: 'es',
        communicationStyle: 'formal',
        detailLevel: 'detailed'
      }
    })

    expect(context.userContext.userId).toBe('test-user-id')
    expect(context.userContext.role).toBe('gerente')
    expect(context.userContext.companySize).toBe('pyme')
    expect(context.okrContext).toHaveLength(2)
    expect(context.activityContext).toHaveLength(1)
    expect(context.businessContext.okrMaturity).toBe('intermediate')
    expect(context.conversationMetadata.sessionType).toBe('tracking')
  })

  test('should infer session type from context', async () => {
    // Test strategy session (no OKRs)
    const strategyContext = await chatContextBuilder.buildChatContext({
      userId: 'test-user-id',
      currentOKRs: [],
      recentActivity: []
    })
    expect(strategyContext.conversationMetadata.sessionType).toBe('strategy')

    // Test problem solving session (blocked OKRs)
    const blockedOKRs = [...mockOKRContext]
    blockedOKRs[0].status = 'blocked'

    const problemContext = await chatContextBuilder.buildChatContext({
      userId: 'test-user-id',
      currentOKRs: blockedOKRs,
      recentActivity: []
    })
    expect(problemContext.conversationMetadata.sessionType).toBe('problem_solving')
  })

  test('should determine urgency from OKR status', async () => {
    // Test high urgency with urgent deadlines
    const urgentOKRs = [...mockOKRContext]
    urgentOKRs[0].deadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
    urgentOKRs[0].status = 'at_risk'

    const urgentContext = await chatContextBuilder.buildChatContext({
      userId: 'test-user-id',
      currentOKRs: urgentOKRs,
      recentActivity: []
    })
    expect(urgentContext.conversationMetadata.urgency).toBe('high')
  })
})

describe('Conversation Storage', () => {
  let storage: typeof conversationStorage

  beforeAll(async () => {
    storage = conversationStorage
    await storage.initializeTables()
  })

  test('should save and load conversation', async () => {
    const conversationId = 'test-storage-conv'
    const context = {
      conversationId,
      userContext: mockUserContext,
      okrContext: mockOKRContext,
      activityContext: mockActivity,
      conversationHistory: [
        { role: 'user' as const, content: 'Test message' }
      ],
      sessionMetadata: {
        startTime: new Date(),
        lastActivity: new Date(),
        messageCount: 1,
        topics: ['test']
      }
    }

    // Save conversation
    await storage.saveConversation(context)
    await storage.saveMessages(conversationId, context.conversationHistory)

    // Load conversation
    const loaded = await storage.loadConversation(conversationId, mockUserContext.userId)

    expect(loaded.conversation).toBeTruthy()
    expect(loaded.messages).toHaveLength(1)
    expect(loaded.conversation?.id).toBe(conversationId)
  })

  test('should list user conversations', async () => {
    const conversations = await storage.listConversations(mockUserContext.userId, {
      limit: 10
    })

    expect(Array.isArray(conversations)).toBe(true)
    // Note: Actual assertions depend on mocked database responses
  })

  test('should search conversations by content', async () => {
    const results = await storage.searchConversations(
      mockUserContext.userId,
      'objetivos'
    )

    expect(Array.isArray(results)).toBe(true)
  })
})

// Chat Session Manager tests removed - using native Neon Auth only
// describe('Chat Session Manager', () => {
//   Custom session management has been removed in favor of native Stack Auth
// })

describe('OKR Knowledge Base', () => {
  test('should recommend methodologies based on company context', () => {
    const recommendations = OKRKnowledgeBase.getRecommendedMethodology('startup')

    expect(Array.isArray(recommendations)).toBe(true)
    expect(recommendations.length).toBeGreaterThan(0)
    expect(recommendations[0]).toHaveProperty('name')
    expect(recommendations[0]).toHaveProperty('keyPrinciples')
  })

  test('should get industry-specific guidance', () => {
    const guidance = OKRKnowledgeBase.getIndustryGuidance('Tecnología')

    expect(guidance).toBeTruthy()
    expect(guidance?.industry).toContain('Tecnología')
    expect(guidance?.commonObjectives.length).toBeGreaterThan(0)
    expect(guidance?.keyMetrics.length).toBeGreaterThan(0)
  })

  test('should get role-specific guidance', () => {
    const guidance = OKRKnowledgeBase.getRoleGuidance('gerente')

    expect(guidance.role).toBe('gerente')
    expect(guidance.responsibilities.length).toBeGreaterThan(0)
    expect(guidance.focusAreas.length).toBeGreaterThan(0)
    expect(guidance.commonObjectives.length).toBeGreaterThan(0)
  })

  test('should validate OKR quality', () => {
    const goodOKR = {
      objective: 'Mejorar la experiencia del usuario en nuestra plataforma',
      keyResults: [
        'Aumentar NPS de 7.2 a 8.5',
        'Reducir tiempo de carga a menos de 2 segundos',
        'Conseguir 90% de satisfacción en encuestas'
      ]
    }

    const validation = OKRKnowledgeBase.validateOKR(
      goodOKR.objective,
      goodOKR.keyResults
    )

    expect(validation.score).toBeGreaterThan(70)
    expect(Array.isArray(validation.feedback)).toBe(true)
    expect(Array.isArray(validation.suggestions)).toBe(true)
  })

  test('should validate poor OKR quality', () => {
    const poorOKR = {
      objective: 'Ser mejor',
      keyResults: [
        'Hacer cosas buenas',
        'Trabajar más'
      ]
    }

    const validation = OKRKnowledgeBase.validateOKR(
      poorOKR.objective,
      poorOKR.keyResults
    )

    expect(validation.score).toBeLessThan(50)
    expect(validation.feedback.length).toBeGreaterThan(0)
    expect(validation.suggestions.length).toBeGreaterThan(0)
  })

  test('should generate contextual suggestions', () => {
    const suggestions = OKRKnowledgeBase.generateSuggestions({
      industry: 'Tecnología',
      role: 'gerente',
      companySize: 'pyme',
      currentObjective: 'Mejorar la experiencia del usuario'
    })

    expect(suggestions.objectives.length).toBeGreaterThan(0)
    expect(suggestions.keyResults.length).toBeGreaterThan(0)
    expect(suggestions.metrics.length).toBeGreaterThan(0)

    // Should include user/customer related suggestions for UX objective
    expect(suggestions.keyResults.some(kr =>
      kr.toLowerCase().includes('satisfacción') ||
      kr.toLowerCase().includes('cliente')
    )).toBe(true)
  })

  test('should get contextual examples', () => {
    const examples = OKRKnowledgeBase.getContextualExamples(
      'Tecnología',
      'gerente',
      'pyme'
    )

    expect(Array.isArray(examples)).toBe(true)
    examples.forEach(example => {
      expect(example).toHaveProperty('objective')
      expect(example).toHaveProperty('keyResults')
      expect(example).toHaveProperty('industry')
      expect(example).toHaveProperty('role')
    })
  })
})

describe('Integration Tests', () => {
  test('should handle complete conversation flow', async () => {
    const conversationId = 'integration-test-conv'

    // 1. Initialize conversation
    const context = await conversationManager.initializeConversation(
      conversationId,
      mockUserContext,
      mockOKRContext,
      mockActivity
    )

    expect(context.conversationId).toBe(conversationId)

    // 2. Build enhanced context
    const enhancedContext = await chatContextBuilder.buildChatContext({
      userId: mockUserContext.userId,
      conversationId,
      currentOKRs: mockOKRContext,
      recentActivity: mockActivity
    })

    expect(enhancedContext.userContext.userId).toBe(mockUserContext.userId)

    // 3. Add user message
    const userMessage = {
      role: 'user' as const,
      content: '¿Cómo puedo acelerar el progreso de mis OKRs bloqueados?'
    }

    const updatedContext = await conversationManager.addMessage(
      conversationId,
      userMessage
    )

    expect(updatedContext.sessionMetadata.messageCount).toBe(1)

    // 4. Get AI context
    const aiContext = conversationManager.getContextForAI(conversationId)

    expect(aiContext.messages).toHaveLength(1)
    expect(aiContext.systemPrompt).toContain('OKR')
    expect(aiContext.metadata.conversationId).toBe(conversationId)

    // 5. Clean up
    conversationManager.clearConversation(conversationId)
    expect(conversationManager.getActiveConversationsCount()).toBe(0)
  })

  // Session persistence test removed - using native Neon Auth session management
  // test('should handle session persistence and recovery', async () => {
  //   Native Stack Auth handles session persistence automatically
  // })

  test('should provide appropriate knowledge base recommendations', () => {
    // Test startup context
    const startupMethodologies = OKRKnowledgeBase.getRecommendedMethodology('startup')
    expect(startupMethodologies.some(m =>
      m.suitableFor.some(s => s.includes('Startup'))
    )).toBe(true)

    // Test technology industry guidance
    const techGuidance = OKRKnowledgeBase.getIndustryGuidance('Tecnología')
    expect(techGuidance?.commonObjectives.some(obj =>
      obj.toLowerCase().includes('usuario') || obj.toLowerCase().includes('producto')
    )).toBe(true)

    // Test manager role guidance
    const managerGuidance = OKRKnowledgeBase.getRoleGuidance('gerente')
    expect(managerGuidance.focusAreas.some(area =>
      area.toLowerCase().includes('equipo') || area.toLowerCase().includes('operacional')
    )).toBe(true)
  })
})