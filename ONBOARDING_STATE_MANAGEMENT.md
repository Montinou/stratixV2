# Gestión de Estado de Onboarding

## Problema

Usuario en medio del onboarding:
1. Está en `/onboarding/create`
2. Cierra el navegador / Recarga página / Pierde conexión
3. Vuelve a hacer login
4. **¿Qué pasa?** → Debe volver al onboarding, no a otra parte

---

## ✅ Solución: Tabla de Tracking

### Tabla: `onboarding_sessions`

```sql
CREATE TABLE onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,  -- Stack Auth user ID
  email text NOT NULL,

  -- Estado del onboarding
  status text NOT NULL,  -- 'in_progress', 'completed', 'abandoned'
  current_step text NOT NULL,  -- 'create_org', 'accept_invite', 'complete_profile'

  -- Datos parciales (JSON para flexibilidad)
  partial_data jsonb DEFAULT '{}',

  -- Metadata
  invitation_token text,  -- Si llegó por invitación
  started_at timestamp DEFAULT now(),
  completed_at timestamp,
  last_activity timestamp DEFAULT now(),

  -- Auditoría
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX idx_onboarding_user ON onboarding_sessions(user_id);
CREATE INDEX idx_onboarding_status ON onboarding_sessions(status);
CREATE INDEX idx_onboarding_token ON onboarding_sessions(invitation_token);
```

### Estados Posibles:

| Status | Descripción |
|--------|-------------|
| `in_progress` | Usuario en medio del onboarding |
| `completed` | Onboarding terminado (tiene profile) |
| `abandoned` | >7 días sin actividad |

### Steps Posibles:

| Step | Descripción |
|------|-------------|
| `create_org` | Creando organización nueva |
| `accept_invite` | Aceptando invitación |
| `complete_profile` | Completando datos adicionales |

---

## 🔄 Flujo Completo con Persistencia

### Escenario 1: Crear Nueva Organización

```
1. Usuario hace Sign Up
   ↓
2. ensureAuthenticated()
   - No tiene profile
   - No tiene invitación
   ↓
3. Crear sesión de onboarding
   INSERT INTO onboarding_sessions (
     user_id: "user_123",
     email: "user@example.com",
     status: "in_progress",
     current_step: "create_org"
   )
   ↓
4. Redirect → /onboarding/create
   ↓
5. Usuario llena formulario:
   - Nombre: "Mi Empresa"
   - Industria: "Tecnología"
   ↓
   [Usuario cierra navegador aquí] 🔴
   ↓
6. Usuario vuelve, hace login
   ↓
7. ensureAuthenticated()
   - No tiene profile
   - Busca onboarding_sessions WHERE user_id = "user_123"
   - Encuentra: status = "in_progress", step = "create_org"
   ↓
8. Redirect → /onboarding/create
   ↓
9. Página carga partial_data (si hay)
   - Pre-llena campos si guardó borrador
   ↓
10. Usuario completa y envía
    ↓
11. Sistema crea org + profile
    ↓
12. Actualizar sesión:
    UPDATE onboarding_sessions
    SET status = "completed",
        completed_at = now()
    WHERE user_id = "user_123"
    ↓
13. Redirect → /tools ✓
```

### Escenario 2: Aceptar Invitación

```
1. Usuario recibe email, click en link
   ↓
2. /invite/abc123 (sin estar logueado)
   ↓
3. Stack Auth: Sign Up / Sign In
   ↓
4. Después de auth, redirect a /invite/abc123
   ↓
5. Crear sesión de onboarding
   INSERT INTO onboarding_sessions (
     user_id: "user_456",
     email: "invited@example.com",
     status: "in_progress",
     current_step: "accept_invite",
     invitation_token: "abc123"
   )
   ↓
6. Mostrar info de invitación
   ↓
   [Usuario cierra navegador] 🔴
   ↓
7. Usuario vuelve, hace login
   ↓
8. ensureAuthenticated()
   - No tiene profile
   - Busca onboarding_sessions
   - Encuentra: status = "in_progress", step = "accept_invite", token = "abc123"
   ↓
9. Redirect → /invite/abc123
   ↓
10. Usuario acepta
    ↓
11. Sistema crea profile en tenant de la invitación
    ↓
12. Marcar onboarding completo
    ↓
13. Redirect → /tools ✓
```

---

## 💾 Auto-Save de Borradores

Para mejor UX, guardamos borradores automáticamente:

```typescript
// En /onboarding/create
useEffect(() => {
  const autoSave = setTimeout(() => {
    // Guardar cada 30 segundos
    fetch('/api/onboarding/draft', {
      method: 'PUT',
      body: JSON.stringify({
        organizationName: form.organizationName,
        industry: form.industry,
      }),
    });
  }, 30000);

  return () => clearTimeout(autoSave);
}, [form]);
```

Backend guarda en `partial_data`:
```typescript
await db.update(onboardingSessions)
  .set({
    partialData: data,
    lastActivity: new Date(),
  })
  .where(eq(onboardingSessions.userId, userId));
```

---

## 🎯 Actualización de ensureAuthenticated()

```typescript
export async function ensureAuthenticated() {
  const user = await stackServerApp.getUser({ or: 'redirect' });

  // Verificar email verificado
  const isVerified = await user.primaryEmailVerified;
  if (!isVerified) {
    redirect(stackServerApp.urls.emailVerification);
  }

  // 1. Verificar si usuario tiene perfil (onboarding completo)
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
    with: { company: true },
  });

  if (profile) {
    // ✅ Usuario completo → acceso normal
    return { user, profile };
  }

  // 2. Usuario SIN perfil → verificar sesión de onboarding
  let onboardingSession = await db.query.onboardingSessions.findFirst({
    where: eq(onboardingSessions.userId, user.id),
  });

  // 3. Si no hay sesión, crear una nueva
  if (!onboardingSession) {
    // Verificar si tiene invitación pendiente
    const pendingInvitation = await db.query.organizationInvitations.findFirst({
      where: and(
        eq(organizationInvitations.email, user.primaryEmail),
        eq(organizationInvitations.status, 'pending'),
        gte(organizationInvitations.expiresAt, new Date())
      ),
    });

    if (pendingInvitation) {
      // Crear sesión para aceptar invitación
      [onboardingSession] = await db.insert(onboardingSessions).values({
        userId: user.id,
        email: user.primaryEmail,
        status: 'in_progress',
        currentStep: 'accept_invite',
        invitationToken: pendingInvitation.token,
      }).returning();

      redirect(`/invite/${pendingInvitation.token}`);
    } else {
      // Crear sesión para crear organización
      [onboardingSession] = await db.insert(onboardingSessions).values({
        userId: user.id,
        email: user.primaryEmail,
        status: 'in_progress',
        currentStep: 'create_org',
      }).returning();

      redirect('/onboarding/create');
    }
  }

  // 4. Ya hay sesión → continuar donde lo dejó
  switch (onboardingSession.status) {
    case 'in_progress':
      // Actualizar last_activity
      await db.update(onboardingSessions)
        .set({ lastActivity: new Date() })
        .where(eq(onboardingSessions.id, onboardingSession.id));

      // Redirigir según el step
      if (onboardingSession.currentStep === 'accept_invite' && onboardingSession.invitationToken) {
        redirect(`/invite/${onboardingSession.invitationToken}`);
      } else if (onboardingSession.currentStep === 'create_org') {
        redirect('/onboarding/create');
      } else {
        redirect('/onboarding/complete');
      }
      break;

    case 'completed':
      // Extraño: tiene sesión completa pero no tiene profile
      // Limpiar y empezar de nuevo
      await db.delete(onboardingSessions)
        .where(eq(onboardingSessions.id, onboardingSession.id));
      redirect('/onboarding/create');
      break;

    case 'abandoned':
      // Reactivar sesión
      await db.update(onboardingSessions)
        .set({
          status: 'in_progress',
          lastActivity: new Date(),
        })
        .where(eq(onboardingSessions.id, onboardingSession.id));

      if (onboardingSession.currentStep === 'accept_invite' && onboardingSession.invitationToken) {
        redirect(`/invite/${onboardingSession.invitationToken}`);
      } else {
        redirect('/onboarding/create');
      }
      break;
  }

  // No debería llegar aquí
  redirect('/onboarding/create');
}
```

---

## 📝 API Endpoints para Onboarding

### PUT /api/onboarding/draft
Guardar borrador del formulario

```typescript
export async function PUT(request: Request) {
  const user = await stackServerApp.getUser({ or: 'throw' });
  const data = await request.json();

  await db.update(onboardingSessions)
    .set({
      partialData: data,
      lastActivity: new Date(),
    })
    .where(eq(onboardingSessions.userId, user.id));

  return Response.json({ success: true });
}
```

### GET /api/onboarding/status
Obtener estado actual del onboarding

```typescript
export async function GET(request: Request) {
  const user = await stackServerApp.getUser({ or: 'throw' });

  const session = await db.query.onboardingSessions.findFirst({
    where: eq(onboardingSessions.userId, user.id),
  });

  return Response.json(session);
}
```

### POST /api/onboarding/complete
Marcar onboarding como completo

```typescript
export async function POST(request: Request) {
  const user = await stackServerApp.getUser({ or: 'throw' });

  await db.update(onboardingSessions)
    .set({
      status: 'completed',
      completedAt: new Date(),
    })
    .where(eq(onboardingSessions.userId, user.id));

  return Response.json({ success: true });
}
```

---

## 🧹 Limpieza Automática

### Función para marcar sesiones abandonadas

```typescript
// Ejecutar diariamente (cron job o Vercel cron)
export async function cleanupAbandonedSessions() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  await db.update(onboardingSessions)
    .set({ status: 'abandoned' })
    .where(
      and(
        eq(onboardingSessions.status, 'in_progress'),
        lt(onboardingSessions.lastActivity, sevenDaysAgo)
      )
    );
}
```

---

## 🎨 UI de Onboarding con Draft Loading

### /onboarding/create con Draft

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@stackframe/stack';

export default function CreateOrganizationPage() {
  const user = useUser({ or: 'redirect' });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    organizationName: '',
    industry: '',
  });

  // Cargar borrador al montar
  useEffect(() => {
    async function loadDraft() {
      try {
        const response = await fetch('/api/onboarding/status');
        const session = await response.json();

        if (session?.partialData) {
          setForm({
            organizationName: session.partialData.organizationName || '',
            industry: session.partialData.industry || '',
          });
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDraft();
  }, []);

  // Auto-save cada 30 segundos
  useEffect(() => {
    if (!loading && (form.organizationName || form.industry)) {
      const timer = setTimeout(() => {
        fetch('/api/onboarding/draft', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [form, loading]);

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crea tu Organización</CardTitle>
        {form.organizationName && (
          <CardDescription className="text-green-600">
            📝 Borrador guardado automáticamente
          </CardDescription>
        )}
      </CardHeader>
      {/* ... resto del formulario */}
    </Card>
  );
}
```

---

## 📊 Diagrama de Estados

```
┌─────────────┐
│   Sign Up   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ ensureAuthenticated │
└──────┬──────────────┘
       │
       ▼
   Has Profile?
       │
   ┌───┴───┐
  YES     NO
   │       │
   │       ▼
   │   Has Onboarding Session?
   │       │
   │   ┌───┴───┐
   │  YES     NO
   │   │       │
   │   │       ▼
   │   │   Create New Session
   │   │   ├─ Has Invite? → accept_invite
   │   │   └─ No Invite?  → create_org
   │   │
   │   ▼
   │   Session Status?
   │   ├─ in_progress → Continue
   │   ├─ completed   → Cleanup & restart
   │   └─ abandoned   → Reactivate
   │
   ▼
/tools ✓
```

---

## ✅ Checklist de Implementación

### Base de Datos
- [ ] Crear tabla `onboarding_sessions`
- [ ] Crear índices necesarios

### Backend
- [ ] Actualizar `ensureAuthenticated()` con lógica de sesiones
- [ ] API: `PUT /api/onboarding/draft`
- [ ] API: `GET /api/onboarding/status`
- [ ] API: `POST /api/onboarding/complete`
- [ ] Función: `cleanupAbandonedSessions()`

### Frontend
- [ ] Actualizar `/onboarding/create` con draft loading
- [ ] Actualizar `/invite/[token]` con sesión tracking
- [ ] Agregar auto-save en formularios
- [ ] Indicador visual de "borrador guardado"

### Testing
- [ ] Usuario cierra en medio → vuelve al mismo paso
- [ ] Borrador se guarda y se carga correctamente
- [ ] Sesiones abandonadas se marcan después de 7 días
- [ ] Usuario puede completar después de interrupción

---

## 🎯 Ventajas de esta Solución

✅ **Persistencia Robusta**: Estado guardado en DB, no en localStorage
✅ **Auto-Save**: Borrador guardado automáticamente
✅ **Recuperación**: Usuario puede continuar donde lo dejó
✅ **Auditoría**: Sabemos cuántos completan vs. abandonan
✅ **Limpieza**: Sesiones viejas se marcan como abandonadas
✅ **Flexible**: `partial_data` en JSON permite evolución

---

## 📈 Métricas de Onboarding

Con esta tabla podemos medir:

```sql
-- Tasa de completación
SELECT
  COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / COUNT(*) * 100 as completion_rate
FROM onboarding_sessions;

-- Tiempo promedio para completar
SELECT
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60) as avg_minutes
FROM onboarding_sessions
WHERE status = 'completed';

-- Abandono por step
SELECT
  current_step,
  COUNT(*) as abandoned_count
FROM onboarding_sessions
WHERE status = 'abandoned'
GROUP BY current_step;
```

---

¿Procedo con implementar este sistema de persistencia de onboarding?
