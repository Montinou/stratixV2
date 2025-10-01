import { Pool, PoolClient } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@/db/okr-schema';

/**
 * Database connection pool for RLS-enabled queries
 * Uses DATABASE_URL_UNPOOLED for proper session-based RLS context
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

/**
 * Type-safe Drizzle database instance with full schema inference
 */
type Database = NodePgDatabase<typeof schema>;

/**
 * Sets the PostgreSQL session context for Row Level Security (RLS)
 *
 * This sets a session-scoped configuration variable that RLS policies can read
 * to determine the current user. The setting persists for the entire connection
 * until explicitly changed or the connection is released back to the pool.
 *
 * @param userId - The authenticated user's ID to set in the RLS context
 * @param client - PostgreSQL client to set the context on (required for proper RLS)
 * @throws {Error} If userId is null, undefined, or empty string
 * @throws {Error} If client is not provided
 *
 * @example
 * ```ts
 * const client = await pool.connect();
 * try {
 *   await setUserContext('user-123', client);
 *   // Perform RLS-protected queries
 * } finally {
 *   client.release();
 * }
 * ```
 */
export async function setUserContext(
  userId: string,
  client: PoolClient
): Promise<void> {
  if (!userId || userId.trim() === '') {
    throw new Error('User ID is required for RLS context');
  }

  if (!client) {
    throw new Error('A database client is required for setting RLS context');
  }

  // Use local=false for session-scoped setting that persists across queries
  await client.query('SELECT set_config($1, $2, false)', [
    'app.current_user_id',
    userId,
  ]);
}

/**
 * Returns a type-safe Drizzle database instance connected to the unpooled connection
 *
 * @returns Drizzle database instance with full schema inference
 *
 * @example
 * ```ts
 * const db = getDb();
 * const objectives = await db.select().from(schema.objectives);
 * ```
 */
export function getDb(): Database {
  return drizzle(pool, { schema });
}

/**
 * Executes a database operation within an RLS context
 *
 * Sets the user context before executing the callback, ensuring all queries
 * within the callback respect Row Level Security policies for the given user.
 *
 * @param userId - The authenticated user's ID to set in the RLS context
 * @param callback - Async function that receives a type-safe Drizzle database instance
 * @returns The result of the callback function
 * @throws {Error} If userId is invalid or callback execution fails
 *
 * @example
 * ```ts
 * const userObjectives = await withRLSContext('user-123', async (db) => {
 *   return await db.select().from(objectives).where(eq(objectives.status, 'active'));
 * });
 * ```
 */
export async function withRLSContext<T>(
  userId: string,
  callback: (db: Database) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    // Set RLS context for this connection
    await setUserContext(userId, client);

    // Create a Drizzle instance with this specific client
    const db = drizzle(client, { schema });

    // Execute the callback with the RLS-enabled database instance
    return await callback(db);
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}

/**
 * Gracefully closes the database connection pool
 * Should be called when the application is shutting down
 *
 * @example
 * ```ts
 * process.on('SIGTERM', async () => {
 *   await closePool();
 *   process.exit(0);
 * });
 * ```
 */
export async function closePool(): Promise<void> {
  await pool.end();
}
