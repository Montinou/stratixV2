# Migración: Eliminar tenantId de Tablas de IA

## 📋 Resumen

Esta migración **elimina completamente** el campo `tenant_id` de todas las tablas de IA, ya que **NO usamos multi-tenancy** en StratixV2. Solo usamos `company_id` para aislamiento de datos.

## ❓ ¿Por qué esta migración?

El schema original de IA fue creado con soporte multi-tenant (`tenant_id`), pero:

1. ✅ **StratixV2 NO usa multi-tenancy**
2. ✅ **Solo usamos `company_id` para data isolation**
3. ✅ **El campo `tenant_id` es redundante y confuso**
4. ✅ **Mantener ambos campos genera complejidad innecesaria**

**Conclusión**: Eliminamos `tenant_id` completamente y mantenemos solo `company_id`.

---

## 🔄 Cambios Aplicados

### Tablas Afectadas (7 tablas):

```sql
ai_usage_tracking          → tenant_id ELIMINADO
ai_performance_benchmarks  → tenant_id ELIMINADO
conversations              → tenant_id ELIMINADO
conversation_messages      → tenant_id ELIMINADO
ai_insights                → tenant_id ELIMINADO  ← La más usada
knowledge_base             → tenant_id ELIMINADO
ai_configuration           → tenant_id ELIMINADO
```

### Índices Eliminados (7):

```sql
DROP INDEX "ai_usage_tenant_idx";
DROP INDEX "ai_benchmarks_tenant_idx";
DROP INDEX "conversations_tenant_idx";
DROP INDEX "conversation_messages_tenant_idx";
DROP INDEX "ai_insights_tenant_idx";
DROP INDEX "knowledge_base_tenant_idx";
DROP INDEX "ai_config_tenant_idx";
```

---

## 🚀 Cómo Ejecutar la Migración

### ⚠️ IMPORTANTE: Verificar Primero

Antes de ejecutar, verifica si las tablas ya existen en tu DB:

```bash
psql $DATABASE_URL_UNPOOLED -c "\d ai_insights"
```

**Si las tablas NO existen aún**: La migración fallará pero es seguro. Simplemente ejecuta `npx drizzle-kit push` para crear las tablas con el schema correcto.

**Si las tablas SÍ existen**: Ejecuta la migración normalmente.

---

### Opción 1: Script Automatizado (Recomendado)

```bash
# Asegúrate de tener DATABASE_URL configurado
npx tsx scripts/migrate-ai-tenantid.ts
```

### Opción 2: Manual con psql

```bash
# Conecta a tu base de datos
psql $DATABASE_URL_UNPOOLED -f drizzle/0008_ai_tenantid_optional.sql
```

### Opción 3: Drizzle Kit Push (Si las tablas NO existen)

```bash
# Si es la primera vez creando las tablas de IA
npx drizzle-kit push
```

---

## ✅ Verificación

Después de ejecutar la migración, verifica que funcionó:

```sql
-- Verifica que tenant_id ya no existe
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'ai_insights'
  AND column_name = 'tenant_id';

-- No debería devolver resultados
```

Verifica que `company_id` sigue existiendo:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'ai_insights'
  AND column_name = 'company_id';

-- Debería devolver 1 resultado
```

---

## 🔒 Seguridad

Esta migración:
- ✅ **NO elimina datos de negocio**: Solo elimina la columna `tenant_id`
- ✅ **NO afecta `company_id`**: El aislamiento de datos sigue funcionando
- ✅ **ES idempotente**: Usa `IF EXISTS` para evitar errores
- ✅ **NO afecta RLS**: Las políticas RLS usan `company_id`

---

## ⚠️ Rollback

Si por alguna razón necesitas **agregar** `tenant_id` de nuevo:

```sql
-- Agregar columna tenant_id a cada tabla
ALTER TABLE ai_insights ADD COLUMN tenant_id UUID;

-- Poblar con company_id
UPDATE ai_insights SET tenant_id = company_id;

-- Hacer NOT NULL (opcional)
ALTER TABLE ai_insights ALTER COLUMN tenant_id SET NOT NULL;

-- Recrear índice (opcional)
CREATE INDEX ai_insights_tenant_idx ON ai_insights(tenant_id);
```

**IMPORTANTE**: Si haces rollback, también debes actualizar:
- `db/ai-schema.ts` - Agregar `tenantId` de nuevo
- Todo el código que crea insights - Pasar `tenantId`

---

## 📚 Archivos Modificados

### 1. **Schema TypeScript**: `db/ai-schema.ts`

**Antes**:
```typescript
tenantId: uuid('tenant_id').notNull(),
```

**Después**:
```typescript
// ✅ Campo eliminado completamente
```

### 2. **SQL Migration**: `drizzle/0008_ai_tenantid_optional.sql`

```sql
-- Drop indexes
DROP INDEX IF EXISTS "ai_insights_tenant_idx";

-- Drop column
ALTER TABLE "ai_insights" DROP COLUMN IF EXISTS "tenant_id";
```

### 3. **Migration Script**: `scripts/migrate-ai-tenantid.ts`

Script automatizado para ejecutar la migración con validaciones.

---

## 🎯 Impacto en el Código

### Antes (Con tenantId):

```typescript
await db.insert(aiInsights).values({
  userId: user.id,
  title: 'Insight',
  companyId: company.id,
  tenantId: company.id, // ❌ Redundante
});
```

### Después (Sin tenantId):

```typescript
await db.insert(aiInsights).values({
  userId: user.id,
  title: 'Insight',
  companyId: company.id,
  // ✅ Solo company_id - más limpio
});
```

---

## 📝 Comparación con OKR Schema

### OKR Schema (Actual):
```typescript
export const objectives = pgTable('objectives', {
  // ...
  companyId: uuid('company_id').notNull(),
  // ✅ NO tiene tenantId
});
```

### AI Schema (Después de migración):
```typescript
export const aiInsights = pgTable('ai_insights', {
  // ...
  companyId: uuid('company_id').notNull(),
  // ✅ Ahora coincide con OKR schema
});
```

**Consistencia**: Ambos schemas ahora usan el **mismo patrón** de data isolation.

---

## 🔍 FAQ

**Q: ¿Perderé datos al ejecutar esta migración?**
A: No. Solo se elimina la columna `tenant_id`, pero `company_id` permanece intacto.

**Q: ¿Qué pasa si las tablas no existen aún?**
A: La migración usa `IF EXISTS`, así que es seguro ejecutarla. O simplemente usa `npx drizzle-kit push`.

**Q: ¿Necesito actualizar código después de la migración?**
A: No. El código de automatización ya NO usa `tenantId`, por eso esta migración es necesaria.

**Q: ¿Es reversible?**
A: Sí, se puede agregar la columna de nuevo (ver sección Rollback), pero NO es recomendado.

---

## ✅ Checklist Post-Migración

- [ ] Ejecutar migración: `npx tsx scripts/migrate-ai-tenantid.ts`
- [ ] Verificar que `tenant_id` no existe: `psql ... -c "\d ai_insights"`
- [ ] Verificar que `company_id` sigue existiendo
- [ ] Build exitoso: `npm run build`
- [ ] Activar feature flags: `FEATURE_AI_DAILY_OKR_ANALYSIS=true`
- [ ] Probar generación de insights: `/api/insights/generate`
- [ ] Verificar que se crean sin errores en logs

---

**Migración creada**: Octubre 2025
**Versión**: 0008
**Estado**: ✅ Listo para producción
**Urgencia**: 🔴 **REQUERIDA** antes de activar automatizaciones
