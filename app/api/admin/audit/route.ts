import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { profilesRepository } from '@/lib/database/queries/profiles';
import { SyncLoggingService } from '@/lib/services/sync-logging';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schemas
const auditFilterSchema = z.object({
  eventType: z.enum([
    'user_login', 'user_logout', 'profile_update', 'role_change', 'company_transfer',
    'invitation_sent', 'invitation_accepted', 'session_created', 'session_terminated',
    'migration_started', 'migration_completed', 'admin_action', 'security_event',
    'data_export', 'configuration_change', 'sync_operation'
  ]).optional(),
  userId: z.string().optional(),
  companyId: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  outcome: z.enum(['success', 'failure', 'warning', 'pending']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  resourceId: z.string().optional(),
  search: z.string().max(200).optional(),
  limit: z.number().min(1).max(1000).optional().default(100),
  offset: z.number().min(0).optional().default(0),
  sortBy: z.enum(['timestamp', 'eventType', 'userId', 'severity']).optional().default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const auditExportSchema = z.object({
  format: z.enum(['json', 'csv', 'pdf']),
  filters: auditFilterSchema.optional(),
  includeDetails: z.boolean().optional().default(true),
  includeMetadata: z.boolean().optional().default(true),
  dateRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
  reason: z.string().min(10).max(500),
});

const complianceReportSchema = z.object({
  reportType: z.enum(['gdpr', 'sox', 'iso27001', 'custom']),
  dateRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
  includeUserData: z.boolean().optional().default(false),
  includeSystemEvents: z.boolean().optional().default(true),
  includeSecurityEvents: z.boolean().optional().default(true),
  companyIds: z.array(z.string()).optional(),
  requestedBy: z.string().optional(),
});

// Audit event interface
interface AuditEvent {
  id: string;
  eventType: string;
  timestamp: Date;
  userId?: string;
  companyId?: string;
  sessionId?: string;
  resourceId?: string;
  resourceType?: string;
  action: string;
  outcome: 'success' | 'failure' | 'warning' | 'pending';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: {
    description: string;
    changes?: Record<string, { from: any; to: any }>;
    metadata?: Record<string, any>;
    context?: Record<string, any>;
  };
  source: {
    ipAddress: string;
    userAgent: string;
    location?: {
      country?: string;
      city?: string;
    };
  };
  compliance: {
    retention: number; // days
    category: string[];
    sensitive: boolean;
  };
}

// In-memory audit log storage (replace with database in production)
const auditEvents = new Map<string, AuditEvent>();

// Initialize with some mock audit events
function initializeMockAuditEvents() {
  if (auditEvents.size === 0) {
    const mockEvents: AuditEvent[] = [
      {
        id: 'audit_001',
        eventType: 'user_login',
        timestamp: new Date('2024-01-20T10:00:00Z'),
        userId: 'user_1',
        companyId: 'company_1',
        sessionId: 'sess_1',
        action: 'authenticate',
        outcome: 'success',
        severity: 'low',
        details: {
          description: 'User successfully authenticated',
          metadata: { loginMethod: 'stack_auth', deviceType: 'desktop' },
        },
        source: {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          location: { country: 'Chile', city: 'Santiago' },
        },
        compliance: {
          retention: 2555, // 7 years
          category: ['authentication', 'security'],
          sensitive: false,
        },
      },
      {
        id: 'audit_002',
        eventType: 'admin_action',
        timestamp: new Date('2024-01-20T11:30:00Z'),
        userId: 'admin_1',
        companyId: 'company_1',
        resourceId: 'user_2',
        resourceType: 'user_profile',
        action: 'role_change',
        outcome: 'success',
        severity: 'medium',
        details: {
          description: 'User role changed by administrator',
          changes: {
            roleType: { from: 'empleado', to: 'gerente' },
          },
          metadata: { reason: 'Promotion', effectiveDate: '2024-01-21' },
        },
        source: {
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        compliance: {
          retention: 2555,
          category: ['admin', 'user_management'],
          sensitive: true,
        },
      },
      {
        id: 'audit_003',
        eventType: 'security_event',
        timestamp: new Date('2024-01-20T14:15:00Z'),
        userId: 'user_3',
        companyId: 'company_2',
        sessionId: 'sess_3',
        action: 'suspicious_login_attempt',
        outcome: 'warning',
        severity: 'high',
        details: {
          description: 'Login attempt from unusual location detected',
          metadata: { 
            previousLocation: 'Santiago, Chile',
            currentLocation: 'Miami, USA',
            timeDifference: '2 hours',
          },
          context: { securityScore: 75, riskFactors: ['geo_velocity', 'new_device'] },
        },
        source: {
          ipAddress: '203.0.113.1',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
          location: { country: 'USA', city: 'Miami' },
        },
        compliance: {
          retention: 2555,
          category: ['security', 'anomaly_detection'],
          sensitive: true,
        },
      },
    ];

    mockEvents.forEach(event => {
      auditEvents.set(event.id, event);
    });
  }
}

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

// Log audit event
export async function logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<string> {
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const fullEvent: AuditEvent = {
    id: auditId,
    timestamp: new Date(),
    ...event,
  };

  auditEvents.set(auditId, fullEvent);

  // Also log to sync logging service for immediate monitoring
  await SyncLoggingService.log(
    event.severity === 'critical' ? 'critical' : 
    event.severity === 'high' ? 'error' :
    event.severity === 'medium' ? 'warn' : 'info',
    'health_check',
    `Audit: ${event.action}`,
    {
      userId: event.userId,
      companyId: event.companyId,
      details: {
        auditId,
        eventType: event.eventType,
        outcome: event.outcome,
        ...event.details,
      },
      metadata: {
        audit: true,
        ...event.source,
        compliance: event.compliance,
      },
    }
  );

  return auditId;
}

/**
 * GET /api/admin/audit
 * Retrieve audit logs with comprehensive filtering
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
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

    // Initialize mock data
    initializeMockAuditEvents();

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      eventType: searchParams.get('eventType') as any,
      userId: searchParams.get('userId'),
      companyId: searchParams.get('companyId'),
      severity: searchParams.get('severity') as any,
      outcome: searchParams.get('outcome') as any,
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      ipAddress: searchParams.get('ipAddress'),
      userAgent: searchParams.get('userAgent'),
      resourceId: searchParams.get('resourceId'),
      search: searchParams.get('search'),
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      sortBy: searchParams.get('sortBy') as any || 'timestamp',
      sortOrder: searchParams.get('sortOrder') as any || 'desc',
    };

    const validation = auditFilterSchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid filter parameters',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const filters = validation.data;

    // Apply filters
    let filteredEvents = Array.from(auditEvents.values());

    if (filters.eventType) {
      filteredEvents = filteredEvents.filter(e => e.eventType === filters.eventType);
    }
    if (filters.userId) {
      filteredEvents = filteredEvents.filter(e => e.userId === filters.userId);
    }
    if (filters.companyId) {
      filteredEvents = filteredEvents.filter(e => e.companyId === filters.companyId);
    }
    if (filters.severity) {
      filteredEvents = filteredEvents.filter(e => e.severity === filters.severity);
    }
    if (filters.outcome) {
      filteredEvents = filteredEvents.filter(e => e.outcome === filters.outcome);
    }
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filteredEvents = filteredEvents.filter(e => e.timestamp >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filteredEvents = filteredEvents.filter(e => e.timestamp <= toDate);
    }
    if (filters.ipAddress) {
      filteredEvents = filteredEvents.filter(e => e.source.ipAddress.includes(filters.ipAddress!));
    }
    if (filters.resourceId) {
      filteredEvents = filteredEvents.filter(e => e.resourceId === filters.resourceId);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredEvents = filteredEvents.filter(e => 
        e.details.description.toLowerCase().includes(searchLower) ||
        e.action.toLowerCase().includes(searchLower) ||
        (e.userId && e.userId.toLowerCase().includes(searchLower))
      );
    }

    // Sort events
    filteredEvents.sort((a, b) => {
      const aVal = a[filters.sortBy as keyof AuditEvent] as any;
      const bVal = b[filters.sortBy as keyof AuditEvent] as any;
      
      if (aVal < bVal) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Apply pagination
    const paginatedEvents = filteredEvents.slice(filters.offset, filters.offset + filters.limit);

    // Generate statistics
    const stats = {
      total: filteredEvents.length,
      byOutcome: {
        success: filteredEvents.filter(e => e.outcome === 'success').length,
        failure: filteredEvents.filter(e => e.outcome === 'failure').length,
        warning: filteredEvents.filter(e => e.outcome === 'warning').length,
        pending: filteredEvents.filter(e => e.outcome === 'pending').length,
      },
      bySeverity: {
        low: filteredEvents.filter(e => e.severity === 'low').length,
        medium: filteredEvents.filter(e => e.severity === 'medium').length,
        high: filteredEvents.filter(e => e.severity === 'high').length,
        critical: filteredEvents.filter(e => e.severity === 'critical').length,
      },
      byEventType: {} as Record<string, number>,
      timeRange: {
        earliest: filteredEvents.length > 0 ? Math.min(...filteredEvents.map(e => e.timestamp.getTime())) : null,
        latest: filteredEvents.length > 0 ? Math.max(...filteredEvents.map(e => e.timestamp.getTime())) : null,
      },
    };

    // Count by event type
    filteredEvents.forEach(event => {
      stats.byEventType[event.eventType] = (stats.byEventType[event.eventType] || 0) + 1;
    });

    // Log audit access
    await logAuditEvent({
      eventType: 'admin_action',
      userId: user.id,
      action: 'audit_log_access',
      outcome: 'success',
      severity: 'low',
      details: {
        description: 'Administrator accessed audit logs',
        metadata: { filters, resultCount: paginatedEvents.length },
      },
      source: {
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
      compliance: {
        retention: 2555,
        category: ['admin', 'audit_access'],
        sensitive: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        events: paginatedEvents,
        pagination: {
          total: filteredEvents.length,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: filters.offset + filters.limit < filteredEvents.length,
        },
        statistics: stats,
        filters,
        metadata: {
          retrievedAt: new Date().toISOString(),
          retrievedBy: user.id,
          queryDuration: `${Date.now() % 1000}ms`, // Mock query time
        }
      },
      message: `Retrieved ${paginatedEvents.length} audit events`
    });

  } catch (error) {
    console.error('Error retrieving audit logs:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/audit
 * Export audit logs or generate compliance reports
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
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
    const action = body.action;

    if (action === 'export') {
      // Export audit logs
      const validation = auditExportSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid export parameters',
            details: validation.error.issues
          },
          { status: 400 }
        );
      }

      const exportConfig = validation.data;
      
      // Initialize mock data
      initializeMockAuditEvents();

      // Apply filters for export
      let exportEvents = Array.from(auditEvents.values());
      
      if (exportConfig.filters) {
        const filters = exportConfig.filters;
        if (filters.eventType) exportEvents = exportEvents.filter(e => e.eventType === filters.eventType);
        if (filters.userId) exportEvents = exportEvents.filter(e => e.userId === filters.userId);
        if (filters.severity) exportEvents = exportEvents.filter(e => e.severity === filters.severity);
        // Apply other filters...
      }

      // Apply date range
      const fromDate = new Date(exportConfig.dateRange.from);
      const toDate = new Date(exportConfig.dateRange.to);
      exportEvents = exportEvents.filter(e => e.timestamp >= fromDate && e.timestamp <= toDate);

      // Generate export data based on format
      let exportData: any;
      
      switch (exportConfig.format) {
        case 'json':
          exportData = {
            exportInfo: {
              generatedAt: new Date().toISOString(),
              generatedBy: user.id,
              reason: exportConfig.reason,
              dateRange: exportConfig.dateRange,
              totalEvents: exportEvents.length,
            },
            events: exportEvents.map(event => ({
              ...event,
              details: exportConfig.includeDetails ? event.details : undefined,
              source: exportConfig.includeMetadata ? event.source : { ipAddress: event.source.ipAddress },
            })),
          };
          break;

        case 'csv':
          // CSV export can be implemented when needed
          exportData = 'CSV export not implemented yet';
          break;

        case 'pdf':
          // PDF export can be implemented when needed
          exportData = 'PDF export not implemented yet';
          break;
      }

      // Log export action
      await logAuditEvent({
        eventType: 'data_export',
        userId: user.id,
        action: 'audit_export',
        outcome: 'success',
        severity: 'medium',
        details: {
          description: 'Audit logs exported',
          metadata: {
            format: exportConfig.format,
            eventCount: exportEvents.length,
            dateRange: exportConfig.dateRange,
            reason: exportConfig.reason,
          },
        },
        source: {
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
        compliance: {
          retention: 2555,
          category: ['admin', 'data_export', 'compliance'],
          sensitive: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          exportId: `export_${Date.now()}`,
          format: exportConfig.format,
          eventCount: exportEvents.length,
          dateRange: exportConfig.dateRange,
          generatedAt: new Date(),
          content: exportData,
        },
        message: `Audit export completed: ${exportEvents.length} events in ${exportConfig.format} format`
      });

    } else if (action === 'compliance_report') {
      // Generate compliance report
      const validation = complianceReportSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid compliance report parameters',
            details: validation.error.issues
          },
          { status: 400 }
        );
      }

      const reportConfig = validation.data;

      // Comprehensive compliance report generation can be implemented as needed
      const mockComplianceReport = {
        reportId: `compliance_${Date.now()}`,
        reportType: reportConfig.reportType.toUpperCase(),
        dateRange: reportConfig.dateRange,
        generatedAt: new Date(),
        generatedBy: user.id,
        summary: {
          totalEvents: 156,
          complianceEvents: 89,
          securityEvents: 23,
          adminActions: 44,
          userActions: 89,
        },
        findings: [
          {
            category: 'Data Access',
            status: 'compliant',
            events: 45,
            notes: 'All data access events properly logged with user attribution',
          },
          {
            category: 'Administrative Changes',
            status: 'compliant',
            events: 12,
            notes: 'All role and permission changes documented with justification',
          },
          {
            category: 'Security Events',
            status: 'attention_required',
            events: 3,
            notes: 'Three high-severity security events require follow-up documentation',
          },
        ],
        recommendations: [
          'Implement automated compliance checking for real-time monitoring',
          'Enhance user notification system for significant account changes',
          'Consider implementing additional session monitoring for high-privilege users',
        ],
      };

      // Log compliance report generation
      await logAuditEvent({
        eventType: 'admin_action',
        userId: user.id,
        action: 'compliance_report_generated',
        outcome: 'success',
        severity: 'medium',
        details: {
          description: `${reportConfig.reportType.toUpperCase()} compliance report generated`,
          metadata: {
            reportType: reportConfig.reportType,
            dateRange: reportConfig.dateRange,
            requestedBy: reportConfig.requestedBy,
          },
        },
        source: {
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
        compliance: {
          retention: 2555,
          category: ['admin', 'compliance', 'reporting'],
          sensitive: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: mockComplianceReport,
        message: `${reportConfig.reportType.toUpperCase()} compliance report generated successfully`
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Supported actions: export, compliance_report' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in audit action:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}