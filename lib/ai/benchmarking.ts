/**
 * AI Model Benchmarking - Database-backed implementation
 * Replaces in-memory array storage with PostgreSQL persistence
 * Comprehensive benchmarking suite for AI models
 */

// Re-export everything from the database-backed implementation
export * from './benchmarking-db'
export { modelBenchmarkingDB as modelBenchmarking } from './benchmarking-db'