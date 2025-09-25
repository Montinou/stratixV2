import { z } from 'zod';
import { SyncLoggingService } from './sync-logging';

// Session types and interfaces
export type SessionStatus = 'active' | 'inactive' | 'expired' | 'terminated' | 'suspended';
export type SessionType = 'web' | 'mobile' | 'api' | 'admin';
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

export interface UserSession {
  id: string;
  userId: string;
  stackSessionId?: string;
  sessionType: SessionType;
  status: SessionStatus;
  deviceInfo: {
    type: DeviceType;
    userAgent: string;
    ip: string;
    location?: {
      country?: string;
      city?: string;
      timezone?: string;
    };
  };
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  terminatedAt?: Date;
  metadata?: Record<string, any>;
}

export interface SessionActivity {
  id: string;
  sessionId: string;
  activityType: 'login' | 'refresh' | 'api_call' | 'page_view' | 'logout' | 'timeout' | 'security_event';
  timestamp: Date;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}

// Validation schemas
const sessionConfigSchema = z.object({
  maxSessionDuration: z.number().min(300).max(86400 * 30), // 5 minutes to 30 days in seconds
  inactivityTimeout: z.number().min(300).max(86400), // 5 minutes to 24 hours in seconds
  maxConcurrentSessions: z.number().min(1).max(50),
  allowCrossTabSync: z.boolean(),
  enableActivityTracking: z.boolean(),
  securityMode: z.enum(['standard', 'strict', 'paranoid']),
});

export interface SessionConfig {
  maxSessionDuration: number;
  inactivityTimeout: number;
  maxConcurrentSessions: number;
  allowCrossTabSync: boolean;
  enableActivityTracking: boolean;
  securityMode: 'standard' | 'strict' | 'paranoid';
}

/**
 * Advanced session management service
 * Handles session lifecycle, cross-tab synchronization, and security monitoring
 */
export class SessionManagementService {
  private static sessions = new Map<string, UserSession>();
  private static activities = new Map<string, SessionActivity[]>();
  private static userSessions = new Map<string, string[]>(); // userId -> sessionIds[]
  
  // Default configuration
  private static config: SessionConfig = {
    maxSessionDuration: 86400 * 7, // 7 days
    inactivityTimeout: 3600, // 1 hour
    maxConcurrentSessions: 5,
    allowCrossTabSync: true,
    enableActivityTracking: true,
    securityMode: 'standard',
  };

  /**
   * Update session configuration
   */
  static updateConfig(newConfig: Partial<SessionConfig>): void {
    const validation = sessionConfigSchema.partial().safeParse(newConfig);
    if (!validation.success) {
      throw new Error(`Invalid session configuration: ${validation.error.message}`);
    }
    
    this.config = { ...this.config, ...validation.data };
    
    SyncLoggingService.info(
      'health_check',
      'Session configuration updated',
      { details: { newConfig: validation.data } }
    );
  }

  /**
   * Create a new session
   */
  static async createSession(
    userId: string,
    deviceInfo: UserSession['deviceInfo'],
    sessionType: SessionType = 'web',
    options: {
      stackSessionId?: string;
      customDuration?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<{ session: UserSession; created: boolean; terminatedSessions?: string[] }> {
    try {
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();
      
      // Check concurrent session limits
      const userSessionIds = this.userSessions.get(userId) || [];
      const activeSessions = userSessionIds
        .map(id => this.sessions.get(id))
        .filter(s => s && s.status === 'active' && s.expiresAt > now);

      let terminatedSessions: string[] = [];

      // Terminate oldest sessions if limit exceeded
      if (activeSessions.length >= this.config.maxConcurrentSessions) {
        const sessionsToTerminate = activeSessions
          .sort((a, b) => a!.lastActiveAt.getTime() - b!.lastActiveAt.getTime())
          .slice(0, activeSessions.length - this.config.maxConcurrentSessions + 1);

        for (const sessionToTerminate of sessionsToTerminate) {
          if (sessionToTerminate) {
            await this.terminateSession(sessionToTerminate.id, 'concurrent_limit', {
              terminatedBy: 'system',
              reason: 'Maximum concurrent sessions exceeded',
            });
            terminatedSessions.push(sessionToTerminate.id);
          }
        }
      }

      // Calculate expiration
      const customDuration = options.customDuration || this.config.maxSessionDuration;
      const expiresAt = new Date(now.getTime() + customDuration * 1000);

      // Create session
      const session: UserSession = {
        id: sessionId,
        userId,
        stackSessionId: options.stackSessionId,
        sessionType,
        status: 'active',
        deviceInfo,
        createdAt: now,
        lastActiveAt: now,
        expiresAt,
        metadata: options.metadata,
      };

      // Store session
      this.sessions.set(sessionId, session);
      
      // Update user session tracking
      const updatedUserSessions = [sessionId, ...userSessionIds];
      this.userSessions.set(userId, updatedUserSessions);

      // Initialize activity tracking
      if (this.config.enableActivityTracking) {
        this.activities.set(sessionId, []);
        await this.recordActivity(sessionId, 'login', {
          sessionType,
          deviceType: deviceInfo.type,
          location: deviceInfo.location,
        }, deviceInfo.ip, deviceInfo.userAgent);
      }

      await SyncLoggingService.info(
        'profile_sync',
        `Session created for user ${userId}`,
        {
          userId,
          details: {
            sessionId,
            sessionType,
            deviceType: deviceInfo.type,
            terminatedSessions,
          },
        }
      );

      return {
        session,
        created: true,
        terminatedSessions: terminatedSessions.length > 0 ? terminatedSessions : undefined,
      };

    } catch (error) {
      await SyncLoggingService.error(
        'profile_sync',
        `Failed to create session for user ${userId}`,
        { error, userId }
      );
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  static getSession(sessionId: string): UserSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check if session has expired
    if (session.expiresAt < new Date() && session.status === 'active') {
      this.expireSession(sessionId);
      return { ...session, status: 'expired' };
    }

    return session;
  }

  /**
   * Update session activity (refresh last active time)
   */
  static async refreshSession(
    sessionId: string,
    activity?: {
      type?: SessionActivity['activityType'];
      details?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<{ session: UserSession | null; refreshed: boolean }> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || session.status !== 'active') {
        return { session: null, refreshed: false };
      }

      const now = new Date();
      
      // Check if session has expired
      if (session.expiresAt < now) {
        await this.expireSession(sessionId);
        return { session: { ...session, status: 'expired' }, refreshed: false };
      }

      // Update last active time
      session.lastActiveAt = now;

      // Extend session if needed (based on security mode)
      if (this.config.securityMode === 'standard') {
        // Extend session on activity
        const newExpiration = new Date(now.getTime() + this.config.inactivityTimeout * 1000);
        if (newExpiration < session.expiresAt) {
          session.expiresAt = newExpiration;
        }
      }

      // Record activity
      if (this.config.enableActivityTracking && activity) {
        await this.recordActivity(
          sessionId,
          activity.type || 'api_call',
          activity.details || {},
          activity.ipAddress || session.deviceInfo.ip,
          activity.userAgent || session.deviceInfo.userAgent
        );
      }

      return { session, refreshed: true };

    } catch (error) {
      await SyncLoggingService.error(
        'profile_sync',
        `Failed to refresh session ${sessionId}`,
        { error, sessionId }
      );
      return { session: null, refreshed: false };
    }
  }

  /**
   * Get all active sessions for a user
   */
  static getUserSessions(userId: string, includeInactive = false): UserSession[] {
    const sessionIds = this.userSessions.get(userId) || [];
    const sessions = sessionIds
      .map(id => this.sessions.get(id))
      .filter((session): session is UserSession => session !== undefined);

    if (includeInactive) {
      return sessions;
    }

    // Filter to active sessions only
    const now = new Date();
    return sessions.filter(session => 
      session.status === 'active' && session.expiresAt > now
    );
  }

  /**
   * Terminate a specific session
   */
  static async terminateSession(
    sessionId: string,
    reason: string,
    details?: Record<string, any>
  ): Promise<boolean> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) return false;

      session.status = 'terminated';
      session.terminatedAt = new Date();
      session.metadata = {
        ...session.metadata,
        terminationReason: reason,
        terminationDetails: details,
      };

      // Record termination activity
      if (this.config.enableActivityTracking) {
        await this.recordActivity(sessionId, 'logout', {
          reason,
          ...details,
        }, session.deviceInfo.ip, session.deviceInfo.userAgent);
      }

      await SyncLoggingService.info(
        'profile_sync',
        `Session terminated: ${sessionId}`,
        {
          userId: session.userId,
          details: { sessionId, reason, ...details },
        }
      );

      return true;

    } catch (error) {
      await SyncLoggingService.error(
        'profile_sync',
        `Failed to terminate session ${sessionId}`,
        { error, sessionId }
      );
      return false;
    }
  }

  /**
   * Terminate all sessions for a user
   */
  static async terminateUserSessions(
    userId: string,
    reason: string,
    excludeSessionId?: string
  ): Promise<{ terminated: number; failed: number }> {
    const sessionIds = this.userSessions.get(userId) || [];
    let terminated = 0;
    let failed = 0;

    for (const sessionId of sessionIds) {
      if (sessionId === excludeSessionId) continue;
      
      const success = await this.terminateSession(sessionId, reason, {
        terminatedBy: 'system',
        bulkTermination: true,
      });
      
      if (success) terminated++;
      else failed++;
    }

    await SyncLoggingService.info(
      'profile_sync',
      `Bulk session termination for user ${userId}`,
      {
        userId,
        details: { reason, terminated, failed, excluded: excludeSessionId },
      }
    );

    return { terminated, failed };
  }

  /**
   * Expire a session (internal method)
   */
  private static async expireSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'expired';
    
    // Record expiration activity
    if (this.config.enableActivityTracking) {
      await this.recordActivity(sessionId, 'timeout', {
        expirationTime: session.expiresAt,
      }, session.deviceInfo.ip, session.deviceInfo.userAgent);
    }

    await SyncLoggingService.info(
      'profile_sync',
      `Session expired: ${sessionId}`,
      {
        userId: session.userId,
        details: { sessionId, expiresAt: session.expiresAt },
      }
    );
  }

  /**
   * Record session activity
   */
  private static async recordActivity(
    sessionId: string,
    activityType: SessionActivity['activityType'],
    details: Record<string, any>,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    if (!this.config.enableActivityTracking) return;

    const activity: SessionActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      activityType,
      timestamp: new Date(),
      details,
      ipAddress,
      userAgent,
    };

    // Store activity
    const sessionActivities = this.activities.get(sessionId) || [];
    sessionActivities.push(activity);
    
    // Keep only last 1000 activities per session
    if (sessionActivities.length > 1000) {
      sessionActivities.splice(0, sessionActivities.length - 1000);
    }
    
    this.activities.set(sessionId, sessionActivities);
  }

  /**
   * Get session activities
   */
  static getSessionActivities(
    sessionId: string,
    options: {
      activityType?: SessionActivity['activityType'];
      since?: Date;
      limit?: number;
    } = {}
  ): SessionActivity[] {
    const activities = this.activities.get(sessionId) || [];
    let filtered = [...activities];

    if (options.activityType) {
      filtered = filtered.filter(a => a.activityType === options.activityType);
    }

    if (options.since) {
      filtered = filtered.filter(a => a.timestamp >= options.since!);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Clean up expired sessions (maintenance method)
   */
  static async cleanupExpiredSessions(): Promise<{ cleaned: number; errors: number }> {
    const now = new Date();
    let cleaned = 0;
    let errors = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now && session.status === 'active') {
        try {
          await this.expireSession(sessionId);
          cleaned++;
        } catch (error) {
          errors++;
          await SyncLoggingService.error(
            'health_check',
            `Error cleaning up expired session ${sessionId}`,
            { error, sessionId }
          );
        }
      }
    }

    if (cleaned > 0 || errors > 0) {
      await SyncLoggingService.info(
        'health_check',
        `Session cleanup completed: ${cleaned} expired, ${errors} errors`,
        { details: { cleaned, errors } }
      );
    }

    return { cleaned, errors };
  }

  /**
   * Get session statistics
   */
  static getSessionStatistics(): {
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    terminatedSessions: number;
    sessionsByType: Record<SessionType, number>;
    sessionsByDevice: Record<DeviceType, number>;
    averageSessionDuration: number;
    uniqueUsers: number;
  } {
    const allSessions = Array.from(this.sessions.values());
    const now = new Date();

    const active = allSessions.filter(s => s.status === 'active' && s.expiresAt > now);
    const expired = allSessions.filter(s => s.status === 'expired');
    const terminated = allSessions.filter(s => s.status === 'terminated');

    // Count by type
    const sessionsByType: Record<SessionType, number> = {
      web: 0,
      mobile: 0,
      api: 0,
      admin: 0,
    };

    // Count by device
    const sessionsByDevice: Record<DeviceType, number> = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
      unknown: 0,
    };

    // Calculate average duration for completed sessions
    const completedSessions = [...expired, ...terminated];
    const totalDuration = completedSessions.reduce((sum, session) => {
      const endTime = session.terminatedAt || session.expiresAt;
      return sum + (endTime.getTime() - session.createdAt.getTime());
    }, 0);

    allSessions.forEach(session => {
      sessionsByType[session.sessionType]++;
      sessionsByDevice[session.deviceInfo.type]++;
    });

    const uniqueUsers = new Set(allSessions.map(s => s.userId)).size;
    const averageSessionDuration = completedSessions.length > 0 
      ? Math.round(totalDuration / completedSessions.length / 1000) // in seconds
      : 0;

    return {
      totalSessions: allSessions.length,
      activeSessions: active.length,
      expiredSessions: expired.length,
      terminatedSessions: terminated.length,
      sessionsByType,
      sessionsByDevice,
      averageSessionDuration,
      uniqueUsers,
    };
  }

  /**
   * Detect suspicious session activity
   */
  static detectSuspiciousActivity(userId: string): {
    alerts: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      evidence: Record<string, any>;
    }>;
    riskScore: number;
  } {
    const userSessionIds = this.userSessions.get(userId) || [];
    const sessions = userSessionIds
      .map(id => this.sessions.get(id))
      .filter((s): s is UserSession => s !== undefined);

    const alerts = [];
    let riskScore = 0;

    // Check for multiple locations
    const locations = new Set(
      sessions
        .map(s => s.deviceInfo.location?.country)
        .filter(Boolean)
    );

    if (locations.size > 2) {
      alerts.push({
        type: 'geographic_anomaly',
        severity: 'medium' as const,
        description: 'User has active sessions from multiple countries',
        evidence: { countries: Array.from(locations) },
      });
      riskScore += 30;
    }

    // Check for unusual user agents
    const userAgents = sessions.map(s => s.deviceInfo.userAgent);
    const uniqueUserAgents = new Set(userAgents);
    
    if (uniqueUserAgents.size > 3) {
      alerts.push({
        type: 'device_anomaly',
        severity: 'low' as const,
        description: 'User has sessions from multiple different devices/browsers',
        evidence: { uniqueDevices: uniqueUserAgents.size },
      });
      riskScore += 10;
    }

    // Check for rapid session creation
    const recentSessions = sessions
      .filter(s => s.createdAt > new Date(Date.now() - 3600000)) // Last hour
      .length;

    if (recentSessions > 5) {
      alerts.push({
        type: 'rapid_session_creation',
        severity: 'high' as const,
        description: 'Unusually high number of new sessions in the last hour',
        evidence: { recentSessions, timeWindow: '1 hour' },
      });
      riskScore += 50;
    }

    return { alerts, riskScore };
  }
}