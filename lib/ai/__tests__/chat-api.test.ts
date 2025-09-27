import { describe, test, expect, beforeEach, vi, beforeAll } from 'vitest'
import { createRequest, createResponse } from 'node-mocks-http'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/stack', () => ({
  stackServerApp: {
    getUser: vi.fn().mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com'
    })
  }
}))

vi.mock('@ai-sdk/gateway', () => ({
  gateway: vi.fn(() => vi.fn())
}))

vi.mock('ai', () => ({
  streamText: vi.fn().mockResolvedValue({
    toDataStreamResponse: vi.fn().mockReturnValue(
      new Response('Test streaming response', {
        headers: { 'Content-Type': 'text/plain' }
      })
    )
  }),
  generateText: vi.fn().mockResolvedValue({
    text: 'Test AI response for OKR assistance'
  }),
  convertToCoreMessages: vi.fn(messages => messages)
}))

vi.mock('../conversation-manager', () => ({
  conversationManager: {
    initializeConversation: vi.fn().mockResolvedValue({
      conversationId: 'test-conv',
      userContext: { userId: 'test-user-id', role: 'gerente' },
      okrContext: [],
      activityContext: []
    }),
    addMessage: vi.fn().mockResolvedValue({}),
    getContextForAI: vi.fn().mockReturnValue({
      messages: [],
      systemPrompt: 'Test system prompt',
      metadata: { conversationId: 'test-conv' }
    })
  }
}))

vi.mock('../chat-context', () => ({
  chatContextBuilder: {
    buildChatContext: vi.fn().mockResolvedValue({
      userContext: {
        userId: 'test-user-id',
        role: 'gerente',
        profile: { name: 'Test User' },
        companySize: 'pyme'
      },
      okrContext: [],
      activityContext: [],
      businessContext: {
        okrMaturity: 'intermediate',
        currentChallenges: []
      },
      conversationMetadata: {
        sessionType: 'general',
        urgency: 'low',
        expectedOutcome: ['clarification']
      }
    })
  }
}))

// Import the route handlers after mocking
const POST = async (request: NextRequest) => {
  // Import here to ensure mocks are applied
  const { POST: routeHandler } = await import('../../../app/api/ai/chat/route')
  return routeHandler(request)
}

const GET = async (request: NextRequest) => {
  const { GET: routeHandler } = await import('../../../app/api/ai/chat/route')
  return routeHandler(request)
}

describe('Chat API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/ai/chat', () => {
    test('should handle basic chat request with message', async () => {
      const requestBody = {
        message: '¿Cómo puedo mejorar mis OKRs?',
        streaming: false,
        preferences: {
          language: 'es',
          communicationStyle: 'formal',
          detailLevel: 'detailed'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData).toHaveProperty('message')
      expect(responseData).toHaveProperty('conversationId')
      expect(responseData.message).toContain('OKR')
    })

    test('should handle streaming chat request', async () => {
      const requestBody = {
        message: '¿Qué son los OKRs?',
        streaming: true,
        context: {
          userRole: 'gerente',
          companySize: 'pyme'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/plain')
    })

    test('should handle legacy messages array format', async () => {
      const requestBody = {
        messages: [
          { role: 'user', content: '¿Cómo defino objetivos SMART?' },
          { role: 'assistant', content: 'Los objetivos SMART son...' },
          { role: 'user', content: '¿Puedes darme un ejemplo?' }
        ],
        conversationId: 'existing-conv-123',
        streaming: false
      }

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData).toHaveProperty('conversationId', 'existing-conv-123')
    })

    test('should handle request with OKR context', async () => {
      const requestBody = {
        message: 'Analiza el progreso de mis OKRs',
        context: {
          currentOKRs: [
            {
              id: 'okr-1',
              title: 'Mejorar satisfacción del cliente',
              type: 'objective',
              status: 'on_track',
              progress: 75
            }
          ],
          userRole: 'gerente',
          department: 'Customer Success'
        },
        streaming: false
      }

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData).toHaveProperty('suggestions')
      expect(responseData).toHaveProperty('metadata')
      expect(responseData.metadata).toHaveProperty('sessionType')
    })

    test('should return 401 for unauthenticated requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Test' })
      })

      // Mock unauthenticated user
      const { stackServerApp } = await import('@/stack')
      vi.mocked(stackServerApp.getUser).mockResolvedValueOnce(null)

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    test('should return 400 for invalid request format', async () => {
      const requestBody = {
        // Missing required message field
        streaming: false
      }

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData).toHaveProperty('error')
    })

    test('should handle rate limiting', async () => {
      const requestBody = {
        message: 'Test rate limiting'
      }

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-user-rate-limited'
        },
        body: JSON.stringify(requestBody)
      })

      // Simulate rate limit exceeded by making multiple requests
      const requests = Array(55).fill(null).map(() => POST(request))
      const responses = await Promise.all(requests)

      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })

    test('should include conversation headers in streaming response', async () => {
      const requestBody = {
        message: 'Test headers',
        streaming: true
      }

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('x-conversation-id')).toBeTruthy()
      expect(response.headers.get('x-session-type')).toBeTruthy()
      expect(response.headers.get('x-urgency')).toBeTruthy()
    })

    test('should generate appropriate follow-up suggestions', async () => {
      const requestBody = {
        message: 'Ayúdame a definir objetivos para mi equipo de ventas',
        context: {
          userRole: 'gerente',
          department: 'Sales'
        },
        streaming: false
      }

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(responseData.suggestions).toBeDefined()
      expect(Array.isArray(responseData.suggestions)).toBe(true)
      expect(responseData.suggestions.length).toBeGreaterThan(0)
      expect(responseData.suggestions.length).toBeLessThanOrEqual(3)
    })
  })

  describe('GET /api/ai/chat', () => {
    test('should return health status for authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      })

      const response = await GET(request)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData).toHaveProperty('status')
      expect(responseData).toHaveProperty('timestamp')
      expect(responseData).toHaveProperty('availableModels')
      expect(responseData).toHaveProperty('user')
      expect(responseData.user).toHaveProperty('hasAccess', true)
    })

    test('should return 401 for unauthenticated health check', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'GET'
      })

      // Mock unauthenticated user
      const { stackServerApp } = await import('@/stack')
      vi.mocked(stackServerApp.getUser).mockResolvedValueOnce(null)

      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('Error Handling', () => {
    test('should handle AI Gateway errors gracefully', async () => {
      // Mock AI Gateway error
      const { generateText } = await import('ai')
      vi.mocked(generateText).mockRejectedValueOnce(new Error('API key invalid'))

      const requestBody = {
        message: 'Test AI error',
        streaming: false
      }

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    test('should handle conversation manager errors', async () => {
      // Mock conversation manager error
      const { conversationManager } = await import('../conversation-manager')
      vi.mocked(conversationManager.initializeConversation).mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      const requestBody = {
        message: 'Test conversation error',
        streaming: false
      }

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    test('should handle timeout errors', async () => {
      // Mock timeout error
      const { generateText } = await import('ai')
      vi.mocked(generateText).mockRejectedValueOnce(new Error('Request timeout'))

      const requestBody = {
        message: 'Test timeout',
        streaming: false
      }

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(504)
    })
  })

  describe('Context and Model Selection', () => {
    test('should use premium model for complex scenarios', async () => {
      const complexOKRs = Array(15).fill(null).map((_, i) => ({
        id: `okr-${i}`,
        title: `Complex objective ${i}`,
        type: 'objective',
        status: 'blocked',
        progress: 30
      }))

      const requestBody = {
        message: 'This is a very long and complex message about OKRs that requires detailed analysis and comprehensive recommendations for improving our organizational alignment and strategic execution across multiple departments and stakeholder groups'.repeat(3),
        context: {
          currentOKRs: complexOKRs,
          urgency: 'high'
        },
        streaming: false
      }

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.metadata.model).toBe('openai/gpt-4o')
    })

    test('should use efficient model for simple scenarios', async () => {
      const requestBody = {
        message: '¿Qué significa OKR?',
        context: {
          currentOKRs: [],
          urgency: 'low'
        },
        streaming: false
      }

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.metadata.model).toBe('openai/gpt-4o-mini')
    })
  })
})