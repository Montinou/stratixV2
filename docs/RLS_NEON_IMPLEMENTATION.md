# Row Level Security (RLS) con Neon + Stack Auth

## Problema Original

El sistema tenía políticas RLS configuradas pero **no estaban funcionando** porque:

1. Las políticas usaban `auth.user_id()` de Supabase (ya no disponible)
2. Otras políticas esperaban `app.current_user_id` pero nunca se configuraba
3. Resultado: En `/tools/admin` se mostraban TODOS los usuarios en lugar de filtrar por company

## Solución Implementada

### 1. Políticas RLS Actualizadas

Se eliminaron las políticas antiguas y se crearon nuevas que usan `current_setting('app.current_user_id', true)`:

```sql
-- Ejemplo: Política para profiles
CREATE POLICY "profiles_company_access" ON profiles FOR ALL USING (
  company_id IN (
    SELECT company_id
    FROM profiles
    WHERE id = current_setting('app.current_user_id', true)::uuid
  )
);
```

**Políticas aplicadas a:**
- `profiles` - Solo perfiles de la misma company
- `objectives` - Solo objetivos de la misma company
- `initiatives` - Solo iniciativas de la misma company
- `activities` - Solo actividades de la misma company
- `companies` - Solo la company propia

### 2. Helper `withRLSContext`

Creado en `/lib/db/rls-context.ts`:

```typescript
export async function withRLSContext<T>(
  callback: () => Promise<T>
): Promise<T>
```

**Cómo funciona:**
1. Obtiene el usuario autenticado de Stack Auth
2. Inicia una transacción de base de datos
3. Ejecuta `SET LOCAL app.current_user_id = <user_id>`
4. Ejecuta el callback con las queries
5. Las políticas RLS filtran automáticamente por company_id

**Ventajas:**
- Compatible con connection pooling de Neon
- `SET LOCAL` solo afecta la transacción actual
- No interfiere con otras conexiones del pool
- Funciona con Drizzle ORM

### 3. Uso en el Código

**Antes:**
```typescript
const companyProfiles = await db.query.profiles.findMany({
  where: eq(profiles.companyId, currentProfile.companyId),
});
```

**Ahora (Defensa en Profundidad):**
```typescript
import { withRLSContext } from '@/lib/db/rls-context';

const { companyProfiles } = await withRLSContext(async () => {
  const companyProfiles = await db.query.profiles.findMany({
    where: eq(profiles.companyId, currentProfile.companyId),
  });
  return { companyProfiles };
});
```

## Estrategia: Defensa en Profundidad

Mantenemos **TANTO** el filtrado manual en código **COMO** RLS:

1. **Código filtra por `company_id`** - Primera línea de defensa
2. **RLS valida a nivel DB** - Safety net si olvidamos filtrar
3. **Resultado:** Doble protección contra data leaks

## Por Qué No Usar Neon RLS (auth.user_id())

Neon RLS nativo con `auth.user_id()` solo funciona con:
- HTTP Data API (no conexiones directas `node-postgres`)
- JWT de Auth0/Clerk (no Stack Auth)

**Nosotros usamos:**
- Conexiones directas con `node-postgres`
- Stack Auth (no Clerk/Auth0)
- Connection pooling

Por eso implementamos **RLS tradicional de PostgreSQL** con `SET LOCAL`.

## Cuándo Usar `withRLSContext`

### ✅ Usar en:
- Queries que acceden a datos multi-tenant (`profiles`, `objectives`, etc.)
- Componentes server-side que muestran datos de usuarios
- API routes que retornan datos sensibles
- Operaciones críticas de lectura/escritura

### ⚠️ No necesario en:
- Queries a tablas sin multi-tenancy
- Operaciones de sistema/admin con `withoutRLS`
- Background jobs (usar `withRLSContextFor(userId)`)

## Helpers Disponibles

```typescript
// Normal - Usa el usuario autenticado actual
await withRLSContext(async () => { ... });

// Específico - Para operaciones admin/background
await withRLSContextFor(userId, async () => { ... });

// Sin RLS - Solo para operaciones de sistema (⚠️ usar con precaución)
await withoutRLS(async () => { ... });
```

## Testing RLS

Para verificar que RLS funciona:

```typescript
// Debería devolver solo perfiles de la company del usuario
const profiles = await withRLSContext(async () => {
  return await db.query.profiles.findMany();
  // No necesita WHERE - RLS filtra automáticamente
});
```

## Migración de Código Existente

**Patrón de migración:**

1. Identifica queries a tablas multi-tenant
2. Envuelve en `withRLSContext`
3. Mantén el filtro `WHERE company_id = ...` (defensa en profundidad)
4. Prueba que solo retorna datos de la company correcta

## Troubleshooting

### Error: "No authenticated user found for RLS context"
**Causa:** `stackServerApp.getUser()` retornó `null`
**Solución:** Asegurar que la ruta requiere autenticación

### Queries retornan vacío
**Causa:** Usuario no tiene `company_id` asignado
**Solución:** Verificar que el perfil del usuario tenga `company_id` poblado

### RLS no filtra
**Causa:** Query ejecutada fuera de `withRLSContext`
**Solución:** Envolver la query en el helper

## Referencias

- [Neon Connection Pooling](https://neon.com/docs/connect/connection-pooling)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Drizzle Transactions](https://orm.drizzle.team/docs/transactions)
