import { NextRequest, NextResponse } from 'next/server';
import { analyzeAllCompanies } from '@/lib/ai/okr-analyzer';
import { processAllCompanies as processSmartReminders } from '@/lib/ai/smart-reminders';
import { generateAllCompanyReports } from '@/lib/ai/report-generator';
import { isFeatureEnabled, logEnabledFeatures } from '@/lib/config/feature-flags';

/**
 * GET /api/cron/ai-automation
 *
 * Unified AI automation endpoint for OKR analysis, smart reminders, and weekly reports
 * Consolidates three separate cron jobs into one to stay within Vercel plan limits
 *
 * Features (controlled by feature flags):
 * 1. Daily OKR Analysis (FEATURE_AI_DAILY_OKR_ANALYSIS)
 *    - Detects objectives at risk
 *    - Identifies blocked initiatives
 *    - Recognizes high performers
 *    - Generates AI insights
 *
 * 2. Smart Reminders (FEATURE_AI_SMART_REMINDERS)
 *    - Objectives without updates (7+ days)
 *    - Upcoming deadlines (3 days before)
 *    - Completion celebrations
 *
 * 3. Weekly Reports (FEATURE_AI_WEEKLY_REPORTS) - Mondays only
 *    - Executive summary
 *    - Weekly metrics
 *    - Top performers
 *    - Performance by area
 *
 * Configuration in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/ai-automation",
 *     "schedule": "0 8 * * *"  // Daily at 8am
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Log enabled features
    logEnabledFeatures();

    // Verify authorization (Vercel Cron secret)
    const authHeader = request.headers.get('authorization');
    if (
      process.env.NODE_ENV === 'production' &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron: AI Automation] Starting AI automation tasks...');
    const startTime = Date.now();

    // Determine if it's Monday (for weekly reports)
    const today = new Date();
    const isMonday = today.getDay() === 1;

    const results = {
      dailyAnalysis: null as any,
      smartReminders: null as any,
      weeklyReports: null as any,
    };

    // Task 1: Daily OKR Analysis
    if (isFeatureEnabled('AI_DAILY_OKR_ANALYSIS')) {
      console.log('[Cron: AI Automation] Running daily OKR analysis...');
      try {
        const analysisResults = await analyzeAllCompanies();

        const totalStats = analysisResults.reduce(
          (acc, result) => ({
            objectivesAtRisk: acc.objectivesAtRisk + result.analysis.objectivesAtRisk,
            blockedInitiatives: acc.blockedInitiatives + result.analysis.blockedInitiatives,
            highPerformers: acc.highPerformers + result.analysis.highPerformers,
            insightsGenerated: acc.insightsGenerated + result.analysis.insightsGenerated,
          }),
          { objectivesAtRisk: 0, blockedInitiatives: 0, highPerformers: 0, insightsGenerated: 0 }
        );

        results.dailyAnalysis = {
          success: true,
          companiesAnalyzed: analysisResults.length,
          totalObjectivesAtRisk: totalStats.objectivesAtRisk,
          totalBlockedInitiatives: totalStats.blockedInitiatives,
          totalHighPerformers: totalStats.highPerformers,
          totalInsightsGenerated: totalStats.insightsGenerated,
        };

        console.log('[Cron: AI Automation] Daily analysis complete:', results.dailyAnalysis);
      } catch (error) {
        console.error('[Cron: AI Automation] Error in daily analysis:', error);
        results.dailyAnalysis = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    } else {
      console.log('[Cron: AI Automation] Daily OKR analysis skipped (feature disabled)');
      results.dailyAnalysis = { skipped: true, reason: 'Feature disabled' };
    }

    // Task 2: Smart Reminders
    if (isFeatureEnabled('AI_SMART_REMINDERS')) {
      console.log('[Cron: AI Automation] Processing smart reminders...');
      try {
        const reminderResults = await processSmartReminders();

        const totalStats = reminderResults.reduce(
          (acc, result) => ({
            staleObjectives: acc.staleObjectives + result.reminders.staleObjectives,
            upcomingDeadlines: acc.upcomingDeadlines + result.reminders.upcomingDeadlines,
            completionCelebrations: acc.completionCelebrations + result.reminders.completionCelebrations,
          }),
          { staleObjectives: 0, upcomingDeadlines: 0, completionCelebrations: 0 }
        );

        results.smartReminders = {
          success: true,
          companiesProcessed: reminderResults.length,
          totalStaleReminders: totalStats.staleObjectives,
          totalDeadlineReminders: totalStats.upcomingDeadlines,
          totalCelebrations: totalStats.completionCelebrations,
          totalRemindersSent:
            totalStats.staleObjectives + totalStats.upcomingDeadlines + totalStats.completionCelebrations,
        };

        console.log('[Cron: AI Automation] Smart reminders complete:', results.smartReminders);
      } catch (error) {
        console.error('[Cron: AI Automation] Error processing smart reminders:', error);
        results.smartReminders = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    } else {
      console.log('[Cron: AI Automation] Smart reminders skipped (feature disabled)');
      results.smartReminders = { skipped: true, reason: 'Feature disabled' };
    }

    // Task 3: Weekly Reports (Mondays only)
    if (isMonday && isFeatureEnabled('AI_WEEKLY_REPORTS')) {
      console.log('[Cron: AI Automation] Generating weekly reports (Monday)...');
      try {
        const reportResults = await generateAllCompanyReports();

        const totalStats = reportResults.reduce(
          (acc, result) => ({
            totalObjectives: acc.totalObjectives + result.reportData.objectives.total,
            totalInitiatives: acc.totalInitiatives + result.reportData.initiatives.total,
            totalActivitiesCompleted: acc.totalActivitiesCompleted + result.reportData.activities.completedThisWeek,
            reportsSent: acc.reportsSent + result.reportSent,
          }),
          { totalObjectives: 0, totalInitiatives: 0, totalActivitiesCompleted: 0, reportsSent: 0 }
        );

        results.weeklyReports = {
          success: true,
          companiesProcessed: reportResults.length,
          totalReportsSent: totalStats.reportsSent,
          totalObjectivesTracked: totalStats.totalObjectives,
          totalInitiativesTracked: totalStats.totalInitiatives,
          totalActivitiesCompletedThisWeek: totalStats.totalActivitiesCompleted,
        };

        console.log('[Cron: AI Automation] Weekly reports complete:', results.weeklyReports);
      } catch (error) {
        console.error('[Cron: AI Automation] Error generating weekly reports:', error);
        results.weeklyReports = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    } else {
      const skipReason = !isMonday ? 'Not Monday' : 'Feature disabled';
      console.log(`[Cron: AI Automation] Weekly reports skipped (${skipReason})`);
      results.weeklyReports = { skipped: true, reason: skipReason };
    }

    const executionTime = Date.now() - startTime;

    console.log('[Cron: AI Automation] All tasks complete:', {
      executionTimeMs: executionTime,
      isMonday,
    });

    return NextResponse.json({
      success: true,
      message: 'AI automation tasks completed',
      summary: {
        executionTimeMs: executionTime,
        isMonday,
        dailyAnalysis: results.dailyAnalysis,
        smartReminders: results.smartReminders,
        weeklyReports: results.weeklyReports,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron: AI Automation] Unexpected error:', error);

    return NextResponse.json(
      {
        error: 'Failed to execute AI automation tasks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
