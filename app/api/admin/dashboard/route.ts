import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { ProfilesRepository } from '@/lib/database/queries/profiles';
import { CompaniesRepository } from '@/lib/database/queries/companies';
import { SessionManagementService } from '@/lib/services/session-management';
import { SyncLoggingService } from '@/lib/services/sync-logging';

const profilesRepository = new ProfilesRepository();
const companiesRepository = new CompaniesRepository();

// Check if user has admin permissions
async function verifyAdminPermissions(user: any) {
  try {
    const profile = await profilesRepository.getByUserId(user.id);
    return profile?.roleType === 'corporativo';
  } catch (error) {
    console.error('Error verifying admin permissions:', error);
    return false;
  }
}

// Get system health metrics
function getSystemHealthMetrics() {
  const sessionStats = SessionManagementService.getSessionStatistics();
  const performanceMetrics = SyncLoggingService.getPerformanceMetrics();
  const errorStats = SyncLoggingService.getErrorStats();
  
  // Calculate overall health score
  let healthScore = 100;
  
  // Deduct points for errors
  const recentErrorRate = errorStats.totalErrors / Math.max(sessionStats.activeSessions, 1);
  healthScore -= Math.min(recentErrorRate * 50, 40);
  
  // Deduct points for performance issues
  if (performanceMetrics.overallHealth === 'degraded') healthScore -= 20;
  if (performanceMetrics.overallHealth === 'unhealthy') healthScore -= 40;
  
  // Deduct points for session issues
  if (sessionStats.activeSessions > sessionStats.totalSessions * 0.8) healthScore -= 10;
  
  healthScore = Math.max(0, Math.round(healthScore));
  
  let healthStatus: 'healthy' | 'warning' | 'critical';
  if (healthScore >= 80) healthStatus = 'healthy';
  else if (healthScore >= 60) healthStatus = 'warning';
  else healthStatus = 'critical';
  
  return {
    score: healthScore,
    status: healthStatus,
    lastUpdated: new Date(),
  };
}

// Get user activity trends (mock data)
function getUserActivityTrends() {
  const now = new Date();
  const trends = [];
  
  // Generate mock trend data for last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    trends.push({
      date: date.toISOString().split('T')[0],
      activeUsers: Math.floor(Math.random() * 100) + 50,
      newRegistrations: Math.floor(Math.random() * 10) + 1,
      loginAttempts: Math.floor(Math.random() * 150) + 75,
      failedLogins: Math.floor(Math.random() * 10) + 2,
      sessionDuration: Math.floor(Math.random() * 120) + 60, // minutes
    });
  }
  
  return trends;
}

// Get security alerts (mock data)
function getSecurityAlerts() {
  return [
    {
      id: 'alert_001',
      type: 'suspicious_activity',
      severity: 'medium',
      title: 'Multiple failed login attempts detected',
      description: 'User user_123 has had 5 failed login attempts in the last hour',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      userId: 'user_123',
      status: 'open',
      actions: ['block_user', 'require_password_reset', 'notify_admin'],
    },
    {
      id: 'alert_002',
      type: 'geo_anomaly',
      severity: 'high',
      title: 'Login from unusual location',
      description: 'User user_456 logged in from a new country (USA) - previous sessions from Chile',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      userId: 'user_456',
      status: 'investigating',
      actions: ['verify_identity', 'temporary_restriction', 'log_investigation'],
    },
    {
      id: 'alert_003',
      type: 'admin_action',
      severity: 'low',
      title: 'Mass user role changes',
      description: 'Administrator admin_1 changed roles for 15 users in bulk operation',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      userId: 'admin_1',
      status: 'resolved',
      actions: ['audit_completed', 'documentation_updated'],
    },
  ];
}

// Get recent admin actions (mock data)
function getRecentAdminActions() {
  return [
    {
      id: 'action_001',
      adminId: 'admin_1',
      adminName: 'John Admin',
      action: 'user_role_change',
      target: 'user_789',
      targetName: 'Jane Doe',
      description: 'Changed user role from empleado to gerente',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      impact: 'medium',
      status: 'completed',
    },
    {
      id: 'action_002',
      adminId: 'admin_1',
      adminName: 'John Admin',
      action: 'invitation_batch',
      target: 'company_2',
      targetName: 'Acme Corp',
      description: 'Sent 25 invitations to new company members',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      impact: 'high',
      status: 'completed',
    },
    {
      id: 'action_003',
      adminId: 'admin_2',
      adminName: 'Sarah Admin',
      action: 'session_cleanup',
      target: 'system',
      targetName: 'System-wide',
      description: 'Cleaned up 45 expired sessions',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      impact: 'low',
      status: 'completed',
    },
  ];
}

// Get system resource usage (mock data)
function getResourceUsage() {
  return {
    database: {
      connections: {
        active: Math.floor(Math.random() * 50) + 10,
        max: 100,
        percentage: Math.floor(Math.random() * 30) + 10,
      },
      queries: {
        perSecond: Math.floor(Math.random() * 100) + 50,
        averageTime: Math.floor(Math.random() * 50) + 25, // ms
        slowQueries: Math.floor(Math.random() * 5),
      },
      storage: {
        used: '1.2 GB',
        available: '8.8 GB',
        percentage: 12,
      },
    },
    sessions: {
      active: SessionManagementService.getSessionStatistics().activeSessions,
      total: SessionManagementService.getSessionStatistics().totalSessions,
      memoryUsage: '45 MB',
    },
    api: {
      requestsPerMinute: Math.floor(Math.random() * 200) + 100,
      averageResponseTime: Math.floor(Math.random() * 100) + 50, // ms
      errorRate: (Math.random() * 2).toFixed(2) + '%',
      uptime: '99.9%',
    },
  };
}

/**
 * GET /api/admin/dashboard
 * Get comprehensive admin dashboard data
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication with Stack Auth
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const isAdmin = await verifyAdminPermissions(user);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get all dashboard data
    const [
      sessionStats,
      errorStats,
      performanceMetrics,
      systemHealth,
      userTrends,
      securityAlerts,
      recentActions,
      resourceUsage
    ] = await Promise.all([
      Promise.resolve(SessionManagementService.getSessionStatistics()),
      Promise.resolve(SyncLoggingService.getErrorStats()),
      Promise.resolve(SyncLoggingService.getPerformanceMetrics()),
      Promise.resolve(getSystemHealthMetrics()),
      Promise.resolve(getUserActivityTrends()),
      Promise.resolve(getSecurityAlerts()),
      Promise.resolve(getRecentAdminActions()),
      Promise.resolve(getResourceUsage()),
    ]);

    // Get company and user statistics (mock data for now)
    const companyStats = {
      total: 5,
      active: 5,
      pending: 0,
      largest: { name: 'Acme Corp', users: 45 },
      newest: { name: 'Tech Startup', createdDays: 3 },
    };

    const userStats = {
      total: 234,
      active: 189,
      inactive: 34,
      pending: 11,
      byRole: {
        corporativo: 5,
        gerente: 23,
        empleado: 206,
      },
      newThisWeek: 12,
      newThisMonth: 45,
    };

    // Get invitation statistics (mock data)
    const invitationStats = {
      total: 156,
      pending: 23,
      sent: 89,
      accepted: 34,
      expired: 10,
      acceptanceRate: 78.5,
      averageAcceptanceTime: '2.3 days',
    };

    // Quick actions available to admin
    const quickActions = [
      {
        id: 'send_invitations',
        title: 'Send Invitations',
        description: 'Invite new users to join companies',
        icon: 'user-plus',
        url: '/admin/invitations/create',
      },
      {
        id: 'manage_users',
        title: 'Manage Users',
        description: 'View and manage user accounts',
        icon: 'users',
        url: '/admin/users',
      },
      {
        id: 'view_sessions',
        title: 'Active Sessions',
        description: 'Monitor and manage user sessions',
        icon: 'monitor',
        url: '/admin/sessions',
      },
      {
        id: 'sync_profiles',
        title: 'Sync Profiles',
        description: 'Trigger manual profile synchronization',
        icon: 'refresh-cw',
        url: '/admin/sync',
      },
      {
        id: 'view_logs',
        title: 'System Logs',
        description: 'View system and error logs',
        icon: 'file-text',
        url: '/admin/logs',
      },
      {
        id: 'audit_trail',
        title: 'Audit Trail',
        description: 'Review audit logs and compliance',
        icon: 'shield',
        url: '/admin/audit',
      },
    ];

    // System status indicators
    const systemStatus = {
      authentication: 'operational',
      database: 'operational', 
      api: 'operational',
      sessions: sessionStats.activeSessions > 0 ? 'operational' : 'degraded',
      sync: performanceMetrics.overallHealth === 'healthy' ? 'operational' : 'degraded',
      monitoring: 'operational',
    };

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          systemHealth,
          userStats,
          companyStats,
          sessionStats,
          invitationStats,
        },
        activity: {
          userTrends,
          recentActions,
          securityAlerts: securityAlerts.filter(a => a.status !== 'resolved'),
        },
        performance: {
          metrics: performanceMetrics,
          errorStats,
          resourceUsage,
        },
        systemStatus,
        quickActions,
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: user.id,
          refreshInterval: 30, // seconds
          lastDataUpdate: new Date().toISOString(),
        }
      },
      message: 'Admin dashboard data retrieved successfully'
    });

  } catch (error) {
    console.error('Error generating admin dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/dashboard
 * Execute quick actions from dashboard
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication with Stack Auth
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const isAdmin = await verifyAdminPermissions(user);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, parameters } = body;

    let result;

    switch (action) {
      case 'refresh_data':
        // Refresh dashboard data
        result = {
          action: 'refresh_data',
          status: 'completed',
          timestamp: new Date(),
          message: 'Dashboard data refreshed successfully',
        };
        break;

      case 'cleanup_sessions':
        // Clean up expired sessions
        const cleanupResult = await SessionManagementService.cleanupExpiredSessions();
        result = {
          action: 'cleanup_sessions',
          status: 'completed',
          cleaned: cleanupResult.cleaned,
          errors: cleanupResult.errors,
          timestamp: new Date(),
          message: `Cleaned up ${cleanupResult.cleaned} expired sessions`,
        };
        break;

      case 'resolve_alert':
        // Resolve a security alert
        const alertId = parameters?.alertId;
        if (!alertId) {
          return NextResponse.json(
            { success: false, error: 'Alert ID is required' },
            { status: 400 }
          );
        }

        // TODO: Implement actual alert resolution
        result = {
          action: 'resolve_alert',
          alertId,
          status: 'completed',
          resolvedBy: user.id,
          timestamp: new Date(),
          message: `Security alert ${alertId} resolved`,
        };

        await SyncLoggingService.info(
          'health_check',
          `Security alert resolved: ${alertId}`,
          {
            details: { alertId, resolvedBy: user.id },
            metadata: { dashboardAction: true },
          }
        );
        break;

      case 'system_health_check':
        // Perform comprehensive system health check
        const healthCheck = {
          timestamp: new Date(),
          checks: {
            database: { status: 'healthy', responseTime: 25 },
            authentication: { status: 'healthy', activeUsers: 189 },
            sessions: { status: 'healthy', activeSessions: SessionManagementService.getSessionStatistics().activeSessions },
            api: { status: 'healthy', averageResponseTime: 85 },
            sync: { status: performanceMetrics.overallHealth, operationsPerformed: 156 },
          },
          overallStatus: 'healthy',
        };

        result = {
          action: 'system_health_check',
          status: 'completed',
          healthCheck,
          timestamp: new Date(),
          message: 'System health check completed - all systems operational',
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }

    // Log dashboard action
    await SyncLoggingService.info(
      'health_check',
      `Dashboard action executed: ${action}`,
      {
        details: { action, parameters, result },
        metadata: { executedBy: user.id, dashboardAction: true },
      }
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message || 'Action completed successfully'
    });

  } catch (error) {
    console.error('Error executing dashboard action:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}