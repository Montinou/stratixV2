/**
 * RLS Context Helper for Neon + Stack Auth
 *
 * Establece el contexto de usuario para Row Level Security en PostgreSQL
 * Compatible con connection pooling usando SET LOCAL en transacciones
 */

import db from '@/db';
import { sql } from 'drizzle-orm';
import { stackServerApp } from '@/stack/server';

/**
 * Ejecuta una query con contexto RLS configurado
 *
 * @param callback - Función que ejecuta las queries con RLS habilitado
 * @returns Resultado de la callback
 *
 * NOTA: Esta función usa db.transaction() pero la callback puede usar
 * el `db` global porque estamos en la misma conexión/pool.
 * SET LOCAL solo afecta a la transacción actual.
 */
export async function withRLSContext<T>(
  callback: () => Promise<T>
): Promise<T> {
  // Obtener usuario actual de Stack Auth
  const user = await stackServerApp.getUser();

  if (!user) {
    throw new Error('No authenticated user found for RLS context');
  }

  // Ejecutar en transacción para que SET LOCAL funcione correctamente
  return await db.transaction(async (tx) => {
    // Establecer el user_id en la sesión de la transacción
    // Esto permite que las políticas RLS accedan al user_id
    await tx.execute(
      sql`SET LOCAL app.current_user_id = ${user.id}`
    );

    // Ejecutar la callback
    // IMPORTANTE: Las queries dentro de callback deben usar el objeto 'db' global
    // ya que están en el contexto de esta transacción
    return await callback();
  });
}

/**
 * Variante que permite pasar el userId explícitamente
 * Útil para operaciones administrativas o background jobs
 */
export async function withRLSContextFor<T>(
  userId: string,
  callback: () => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`SET LOCAL app.current_user_id = ${userId}`
    );

    return await callback();
  });
}

/**
 * Helper para ejecutar queries sin RLS (operaciones del sistema)
 * Usar con precaución - solo para operaciones administrativas
 */
export async function withoutRLS<T>(
  callback: () => Promise<T>
): Promise<T> {
  return await callback();
}
