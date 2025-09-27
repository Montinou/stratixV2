/**
 * AI Performance Analytics - Database-backed implementation
 * Replaces in-memory array storage with PostgreSQL persistence
 * Tracks AI operations performance, costs, and quality metrics
 */

// Re-export everything from the database-backed implementation
export * from './performance-analytics-db'
export { performanceAnalyticsDB as performanceAnalytics } from './performance-analytics-db'