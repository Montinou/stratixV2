/**
 * Integration Test for Stack Auth Event Handling & Session Integration
 * 
 * This file validates the complete authentication flow:
 * 1. Stack Auth events trigger profile synchronization
 * 2. Profile data is persisted and available immediately
 * 3. Session state is properly managed
 * 4. Error scenarios are handled gracefully
 */

import type { User } from "@stackframe/stack"
import type { StackClientApp } from "@stackframe/stack"
import type { AuthIntegrationConfig } from "@/lib/types/auth-integration"
import { initializeAuthSync, getAuthState } from "@/middleware/auth-sync"

/**
 * Mock Stack Auth client for testing
 */
class MockStackClient {
  private user: User | null = null
  private listeners: ((user: User | null) => void)[] = []

  getUser(): User | null {
    return this.user
  }

  onUserChange(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback)
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Test helpers
  simulateSignIn(user: User): void {
    this.user = user
    this.listeners.forEach(callback => callback(user))
  }

  simulateSignOut(): void {
    this.user = null
    this.listeners.forEach(callback => callback(null))
  }

  simulateUserUpdate(user: User): void {
    this.user = user
    this.listeners.forEach(callback => callback(user))
  }
}

/**
 * Mock user data for testing
 */
const createMockUser = (id: string, email: string, displayName?: string): User => ({
  id,
  primaryEmail: email,
  displayName: displayName || email,
  // Add other required User properties as needed
} as User)

/**
 * Test configuration
 */
const testConfig: AuthIntegrationConfig = {
  enableAutoProfileCreation: true,
  defaultCompanyId: "test-company-123",
  enableProfileSync: true,
  enableSessionPersistence: true,
  retryAttempts: 2,
  retryDelayMs: 100,
}

/**
 * Test the complete authentication integration flow
 */
export async function testAuthenticationIntegration(): Promise<{
  success: boolean
  results: Array<{ test: string; passed: boolean; message: string }>
}> {
  const results: Array<{ test: string; passed: boolean; message: string }> = []
  let overallSuccess = true

  try {
    console.log('🧪 Starting Stack Auth Integration Test...')

    // 1. Initialize the auth sync system
    const mockStackClient = new MockStackClient()
    let authSyncManager: any

    try {
      authSyncManager = await initializeAuthSync(
        mockStackClient as unknown as StackClientApp,
        testConfig
      )
      
      results.push({
        test: 'Initialize AuthSync',
        passed: true,
        message: 'AuthSync initialized successfully'
      })
    } catch (error) {
      results.push({
        test: 'Initialize AuthSync',
        passed: false,
        message: `Failed to initialize: ${error}`
      })
      overallSuccess = false
    }

    // 2. Test sign-in flow
    const testUser = createMockUser('test-user-123', 'test@example.com', 'Test User')
    
    try {
      console.log('Testing sign-in flow...')
      mockStackClient.simulateSignIn(testUser)
      
      // Give time for async operations
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const authState = getAuthState()
      
      if (authState.user?.id === testUser.id && authState.isReady) {
        results.push({
          test: 'Sign-in Flow',
          passed: true,
          message: 'User signed in and profile synced successfully'
        })
      } else {
        results.push({
          test: 'Sign-in Flow',
          passed: false,
          message: `Sign-in failed: user=${authState.user?.id}, ready=${authState.isReady}`
        })
        overallSuccess = false
      }
    } catch (error) {
      results.push({
        test: 'Sign-in Flow',
        passed: false,
        message: `Sign-in error: ${error}`
      })
      overallSuccess = false
    }

    // 3. Test profile availability
    try {
      const authState = getAuthState()
      
      if (authState.profile && authState.profile.status === 'synced') {
        results.push({
          test: 'Profile Availability',
          passed: true,
          message: 'Profile data available after sign-in'
        })
      } else {
        results.push({
          test: 'Profile Availability',
          passed: false,
          message: `Profile not available: status=${authState.profile?.status}`
        })
        overallSuccess = false
      }
    } catch (error) {
      results.push({
        test: 'Profile Availability',
        passed: false,
        message: `Profile check error: ${error}`
      })
      overallSuccess = false
    }

    // 4. Test user data update
    try {
      console.log('Testing user update flow...')
      const updatedUser = createMockUser('test-user-123', 'test@example.com', 'Updated Test User')
      mockStackClient.simulateUserUpdate(updatedUser)
      
      // Give time for async operations
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const authState = getAuthState()
      
      if (authState.profile?.profile?.fullName === 'Updated Test User') {
        results.push({
          test: 'User Update Flow',
          passed: true,
          message: 'Profile updated when user data changed'
        })
      } else {
        results.push({
          test: 'User Update Flow',
          passed: false,
          message: `Update failed: name=${authState.profile?.profile?.fullName}`
        })
        overallSuccess = false
      }
    } catch (error) {
      results.push({
        test: 'User Update Flow',
        passed: false,
        message: `Update error: ${error}`
      })
      overallSuccess = false
    }

    // 5. Test sign-out flow
    try {
      console.log('Testing sign-out flow...')
      mockStackClient.simulateSignOut()
      
      // Give time for async operations
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const authState = getAuthState()
      
      if (authState.user === null && !authState.isValid) {
        results.push({
          test: 'Sign-out Flow',
          passed: true,
          message: 'Session cleared on sign-out'
        })
      } else {
        results.push({
          test: 'Sign-out Flow',
          passed: false,
          message: `Sign-out failed: user=${authState.user}, valid=${authState.isValid}`
        })
        overallSuccess = false
      }
    } catch (error) {
      results.push({
        test: 'Sign-out Flow',
        passed: false,
        message: `Sign-out error: ${error}`
      })
      overallSuccess = false
    }

    console.log('🧪 Stack Auth Integration Test Complete')
    
    return {
      success: overallSuccess,
      results
    }

  } catch (error) {
    console.error('❌ Integration test failed:', error)
    
    return {
      success: false,
      results: [{
        test: 'Overall Test',
        passed: false,
        message: `Test suite failed: ${error}`
      }]
    }
  }
}

/**
 * Run the integration test and log results
 */
export async function runIntegrationTest(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 Stack Auth Integration Test Suite')
  console.log('='.repeat(60))

  const { success, results } = await testAuthenticationIntegration()

  console.log('\n📋 Test Results:')
  console.log('-'.repeat(40))

  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌'
    console.log(`${index + 1}. ${status} ${result.test}`)
    console.log(`   ${result.message}`)
  })

  console.log('\n' + '-'.repeat(40))
  console.log(`Overall Status: ${success ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`Tests Passed: ${results.filter(r => r.passed).length}/${results.length}`)
  console.log('='.repeat(60))
}

// Export test configuration for use in other tests
export { testConfig, MockStackClient, createMockUser }