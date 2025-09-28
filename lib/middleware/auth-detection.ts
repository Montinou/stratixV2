/**
 * Authentication Middleware Integration for Onboarding
 *
 * Provides middleware for automatic onboarding detection and routing
 * based on authentication events and user state. Integrates with
 * Stack Auth and session management for seamless user experience.
 *
 * Features:
 * - Automatic onboarding status detection on auth events
 * - Seamless routing based on completion state
 * - Integration with Stack Auth lifecycle
 * - Session management integration
 * - Performance monitoring and analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import {
  getOnboardingSessionByUserId,
  getUserActiveOrganizations,
  createOnboardingSession
} from '@/lib/database/onboarding-queries';
import { onboardingCache } from '@/lib/cache/redis';
import { trackEvent } from '@/lib/monitoring/analytics';
import { SessionManager } from '@/lib/session/manager';
import type { OnboardingSession } from '@/lib/database/onboarding-types';

// Middleware configuration
export interface AuthDetectionConfig {
  enabledPaths: string[];
  excludedPaths: string[];
  onboardingPath: string;
  completedRedirectPath: string;
  bypassParam: string;
  cacheEnabled: boolean;
  analyticsEnabled: boolean;
}

// Default configuration
const DEFAULT_CONFIG: AuthDetectionConfig = {
  enabledPaths: ['/dashboard', '/objectives', '/analytics', '/team', '/profile'],
  excludedPaths: ['/api', '/auth', '/_next', '/favicon.ico', '/onboarding'],
  onboardingPath: '/onboarding',
  completedRedirectPath: '/dashboard',
  bypassParam: 'skip_onboarding_check',
  cacheEnabled: true,
  analyticsEnabled: true
};

// Authentication state interface
export interface AuthState {
  isAuthenticated: boolean;
  user?: {
    id: string;
    email: string;
    displayName?: string;
    createdAt: string;
  };
  onboardingStatus: 'not_started' | 'in_progress' | 'completed' | 'abandoned' | 'expired' | 'paused';
  organizationRole?: string;
  hasActiveSession: boolean;
  lastActivity?: string;
}

/**
 * Authentication Detection Middleware Class
 */
export class AuthDetectionMiddleware {
  private config: AuthDetectionConfig;
  private sessionManager: SessionManager;

  constructor(config?: Partial<AuthDetectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionManager = SessionManager.getInstance();
  }

  /**
   * Main middleware function for Next.js
   */
  public async handle(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();
    const { pathname, searchParams } = request.nextUrl;

    try {
      // Skip middleware for excluded paths
      if (this.shouldSkipMiddleware(pathname, searchParams)) {
        return NextResponse.next();
      }

      // Get authentication state
      const authState = await this.getAuthState(request);

      // Track middleware execution
      if (this.config.analyticsEnabled) {
        await this.trackMiddlewareExecution(authState, pathname, startTime);
      }

      // Handle unauthenticated users
      if (!authState.isAuthenticated) {
        return this.handleUnauthenticated(request);
      }

      // Handle authenticated users based on onboarding status
      return this.handleAuthenticated(request, authState);

    } catch (error) {
      console.error('Auth detection middleware error:', error);

      // Track error for monitoring
      if (this.config.analyticsEnabled) {
        await trackEvent('auth_middleware_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          pathname,
          duration: Date.now() - startTime
        }).catch(() => {});
      }

      // Continue without redirecting on error to avoid breaking the app
      return NextResponse.next();
    }
  }

  /**
   * Get current authentication state
   */
  private async getAuthState(request: NextRequest): Promise<AuthState> {
    try {
      // Get user from Stack Auth
      const user = await stackServerApp.getUser();

      if (!user) {
        return {
          isAuthenticated: false,
          onboardingStatus: 'not_started',
          hasActiveSession: false
        };
      }

      // Check cache first for performance
      let onboardingStatus: AuthState['onboardingStatus'] = 'not_started';
      let hasActiveSession = false;
      let organizationRole: string | undefined;

      if (this.config.cacheEnabled) {
        const cachedState = await this.getCachedAuthState(user.id);
        if (cachedState) {
          return cachedState;
        }
      }

      // Get fresh data from database
      const [session, organizations] = await Promise.all([
        getOnboardingSessionByUserId(user.id),
        getUserActiveOrganizations(user.id)
      ]);

      if (session) {
        onboardingStatus = session.status as AuthState['onboardingStatus'];
        hasActiveSession = ['in_progress', 'paused'].includes(session.status);
      }

      if (organizations.length > 0) {
        organizationRole = organizations[0].role;
      }

      const authState: AuthState = {
        isAuthenticated: true,
        user: {
          id: user.id,
          email: user.primaryEmail || '',
          displayName: user.displayName || undefined,
          createdAt: user.createdAt.toISOString()
        },
        onboardingStatus,
        organizationRole,
        hasActiveSession,
        lastActivity: session?.updated_at
      };

      // Cache the result
      if (this.config.cacheEnabled) {
        await this.cacheAuthState(user.id, authState);
      }

      return authState;

    } catch (error) {
      console.error('Error getting auth state:', error);
      return {
        isAuthenticated: false,
        onboardingStatus: 'not_started',
        hasActiveSession: false
      };
    }
  }

  /**
   * Handle unauthenticated users
   */
  private handleUnauthenticated(request: NextRequest): NextResponse {
    // Redirect to sign-in page
    const signInUrl = new URL('/handler/sign-in', request.url);
    signInUrl.searchParams.set('redirect', request.nextUrl.pathname);

    return NextResponse.redirect(signInUrl);
  }

  /**
   * Handle authenticated users based on onboarding status
   */
  private async handleAuthenticated(
    request: NextRequest,
    authState: AuthState
  ): Promise<NextResponse> {
    const { pathname } = request.nextUrl;

    // If user is accessing onboarding pages, check if they should be there
    if (pathname.startsWith(this.config.onboardingPath)) {
      return this.handleOnboardingPageAccess(request, authState);
    }

    // For other protected pages, check onboarding completion
    switch (authState.onboardingStatus) {
      case 'not_started':
        return this.redirectToOnboarding(request, authState, 'new_user');

      case 'in_progress':
      case 'paused':
        return this.redirectToOnboarding(request, authState, 'resume_session');

      case 'abandoned':
      case 'expired':
        return this.redirectToOnboarding(request, authState, 'restart_needed');

      case 'completed':
        // User has completed onboarding, allow access
        return NextResponse.next();

      default:
        // Unknown status, redirect to onboarding to be safe
        return this.redirectToOnboarding(request, authState, 'status_unknown');
    }
  }

  /**
   * Handle access to onboarding pages
   */
  private async handleOnboardingPageAccess(
    request: NextRequest,
    authState: AuthState
  ): Promise<NextResponse> {
    // If onboarding is completed, redirect to dashboard
    if (authState.onboardingStatus === 'completed') {
      const dashboardUrl = new URL(this.config.completedRedirectPath, request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    // If no active session exists, create one
    if (!authState.hasActiveSession && authState.user) {
      try {
        await this.ensureOnboardingSession(authState.user.id);
      } catch (error) {
        console.error('Failed to create onboarding session:', error);
      }
    }

    // Allow access to onboarding pages
    return NextResponse.next();
  }

  /**
   * Redirect to onboarding with appropriate context
   */
  private redirectToOnboarding(
    request: NextRequest,
    authState: AuthState,
    reason: string
  ): NextResponse {
    const onboardingUrl = new URL(this.config.onboardingPath, request.url);

    // Add context parameters
    onboardingUrl.searchParams.set('status', authState.onboardingStatus);
    onboardingUrl.searchParams.set('reason', reason);
    onboardingUrl.searchParams.set('return_to', request.nextUrl.pathname);

    // Add session ID if available
    if (authState.hasActiveSession) {
      onboardingUrl.searchParams.set('resume', 'true');
    }

    return NextResponse.redirect(onboardingUrl);
  }

  /**
   * Ensure onboarding session exists for user
   */
  private async ensureOnboardingSession(userId: string): Promise<void> {
    try {
      const existingSession = await getOnboardingSessionByUserId(userId);

      if (!existingSession) {
        // Create new onboarding session
        const newSession = await createOnboardingSession(userId, 5);

        // Initialize session manager
        await this.sessionManager.createSession(
          newSession.id,
          userId,
          {
            totalSteps: 5,
            preferences: {
              language: 'es',
              communicationStyle: 'informal',
              aiAssistanceLevel: 'moderate',
              autoSave: true,
              notifications: true
            }
          }
        );

        // Track session creation
        if (this.config.analyticsEnabled) {
          await trackEvent('onboarding_session_auto_created', {
            userId,
            sessionId: newSession.id,
            trigger: 'auth_middleware'
          });
        }
      }
    } catch (error) {
      console.error('Failed to ensure onboarding session:', error);
      throw error;
    }
  }

  /**
   * Check if middleware should be skipped for this request
   */
  private shouldSkipMiddleware(pathname: string, searchParams: URLSearchParams): boolean {
    // Skip if bypass parameter is present
    if (searchParams.has(this.config.bypassParam)) {
      return true;
    }

    // Skip for excluded paths
    for (const excludedPath of this.config.excludedPaths) {
      if (pathname.startsWith(excludedPath)) {
        return true;
      }
    }

    // Only apply to enabled paths
    if (this.config.enabledPaths.length > 0) {
      const isEnabledPath = this.config.enabledPaths.some(enabledPath =>
        pathname.startsWith(enabledPath)
      );

      if (!isEnabledPath) {
        return true;
      }
    }

    return false;
  }

  /**
   * Cache auth state for performance
   */
  private async cacheAuthState(userId: string, authState: AuthState): Promise<void> {
    try {
      await onboardingCache.setOnboardingStatus(userId, {
        authState,
        timestamp: Date.now()
      }, 300); // 5 minute cache
    } catch (error) {
      console.error('Failed to cache auth state:', error);
    }
  }

  /**
   * Get cached auth state
   */
  private async getCachedAuthState(userId: string): Promise<AuthState | null> {
    try {
      const cached = await onboardingCache.getOnboardingStatus(userId);

      if (cached?.authState && cached.timestamp) {
        // Check if cache is still valid (5 minutes)
        const isValid = Date.now() - cached.timestamp < 5 * 60 * 1000;

        if (isValid) {
          return cached.authState;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached auth state:', error);
      return null;
    }
  }

  /**
   * Track middleware execution for analytics
   */
  private async trackMiddlewareExecution(
    authState: AuthState,
    pathname: string,
    startTime: number
  ): Promise<void> {
    try {
      await trackEvent('auth_middleware_execution', {
        isAuthenticated: authState.isAuthenticated,
        onboardingStatus: authState.onboardingStatus,
        hasActiveSession: authState.hasActiveSession,
        pathname,
        duration: Date.now() - startTime,
        userId: authState.user?.id
      });
    } catch (error) {
      console.error('Failed to track middleware execution:', error);
    }
  }
}

/**
 * Stack Auth Event Handlers
 *
 * Integration with Stack Auth lifecycle events to trigger
 * onboarding detection and setup automatically
 */
export class StackAuthEventHandler {
  private authMiddleware: AuthDetectionMiddleware;

  constructor(config?: Partial<AuthDetectionConfig>) {
    this.authMiddleware = new AuthDetectionMiddleware(config);
  }

  /**
   * Handle user sign-in event
   */
  public async handleSignIn(user: any): Promise<void> {
    try {
      console.log(`User signed in: ${user.id}`);

      // Check if user needs onboarding
      const session = await getOnboardingSessionByUserId(user.id);

      if (!session) {
        // Create onboarding session for new user
        await createOnboardingSession(user.id, 5);

        // Track new user onboarding start
        await trackEvent('onboarding_auto_started', {
          userId: user.id,
          trigger: 'sign_in_event',
          userCreatedAt: user.createdAt
        });
      } else if (session.status === 'abandoned' || session.status === 'expired') {
        // Reactivate abandoned sessions
        await this.reactivateSession(session);
      }

      // Invalidate cache to ensure fresh data
      await onboardingCache.invalidateOnboardingStatus(user.id);

    } catch (error) {
      console.error('Error handling sign-in event:', error);
    }
  }

  /**
   * Handle user sign-up event
   */
  public async handleSignUp(user: any): Promise<void> {
    try {
      console.log(`New user signed up: ${user.id}`);

      // Always create onboarding session for new users
      const session = await createOnboardingSession(user.id, 5);

      // Initialize session manager
      const sessionManager = SessionManager.getInstance();
      await sessionManager.createSession(
        session.id,
        user.id,
        {
          totalSteps: 5,
          preferences: {
            language: 'es',
            communicationStyle: 'informal',
            aiAssistanceLevel: 'moderate',
            autoSave: true,
            notifications: true
          }
        }
      );

      // Track new user registration
      await trackEvent('user_registered_onboarding_created', {
        userId: user.id,
        sessionId: session.id,
        email: user.primaryEmail
      });

    } catch (error) {
      console.error('Error handling sign-up event:', error);
    }
  }

  /**
   * Handle user sign-out event
   */
  public async handleSignOut(userId: string): Promise<void> {
    try {
      console.log(`User signed out: ${userId}`);

      // Pause any active onboarding sessions
      const session = await getOnboardingSessionByUserId(userId);

      if (session && session.status === 'in_progress') {
        const sessionManager = SessionManager.getInstance();
        await sessionManager.pauseSession(session.id);
      }

      // Clear cache
      await onboardingCache.invalidateOnboardingStatus(userId);

      // Track sign-out
      await trackEvent('user_signed_out', {
        userId,
        hadActiveOnboarding: !!session && session.status === 'in_progress'
      });

    } catch (error) {
      console.error('Error handling sign-out event:', error);
    }
  }

  /**
   * Reactivate an abandoned or expired session
   */
  private async reactivateSession(session: OnboardingSession): Promise<void> {
    try {
      const sessionManager = SessionManager.getInstance();

      // Resume the session
      await sessionManager.resumeSession(session.id);

      // Track reactivation
      await trackEvent('onboarding_session_reactivated', {
        userId: session.user_id,
        sessionId: session.id,
        previousStatus: session.status,
        completionPercentage: session.completion_percentage
      });

    } catch (error) {
      console.error('Failed to reactivate session:', error);
    }
  }
}

/**
 * Utility functions for middleware integration
 */

/**
 * Create middleware instance with default configuration
 */
export function createAuthDetectionMiddleware(
  config?: Partial<AuthDetectionConfig>
): AuthDetectionMiddleware {
  return new AuthDetectionMiddleware(config);
}

/**
 * Create Stack Auth event handler
 */
export function createStackAuthEventHandler(
  config?: Partial<AuthDetectionConfig>
): StackAuthEventHandler {
  return new StackAuthEventHandler(config);
}

/**
 * Middleware function for Next.js middleware.ts file
 */
export async function authDetectionMiddleware(
  request: NextRequest,
  config?: Partial<AuthDetectionConfig>
): Promise<NextResponse> {
  const middleware = createAuthDetectionMiddleware(config);
  return middleware.handle(request);
}

// Export types for external use
export type { AuthDetectionConfig, AuthState };