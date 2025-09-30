# Plan: Sistema Multi-Tenant Real con Invitaciones

## Fecha: 2025-09-30
## Objetivo: Cada tenant independiente con invitaciones propias

---

## 🎯 Requisitos Clarificados

### 1. Multi-Tenancy Real
- **Cada tenant = 1 organización**
- **Cada organización tiene**:
  - Sus propios usuarios (profiles)
  - Sus propios datos (objectives, initiatives, activities)
  - Su propio sistema de invitaciones
  - Aislamiento completo (RLS)

### 2. Flujo de Onboarding

#### Opción A: Crear Nueva Organización
```
Usuario se registra
  ↓
¿Ya tiene invitación pendiente?
  ↓ NO
Pantalla: "Crear tu organización"
  ↓
Ingresa: nombre de empresa, industria
  ↓
Sistema crea:
  - Nueva organización (tenant)
  - Profile del usuario (role: corporativo)
  - tenantId = nueva organización
  ↓
Usuario accede a /tools
```

#### Opción B: Unirse Vía Invitación
```
Usuario recibe email de invitación
  ↓
Click en link con token
  ↓
Pantalla: "Te invitaron a [Org Name]"
Muestra: rol asignado, departamento
  ↓
Usuario acepta
  ↓
Sistema crea:
  - Profile del usuario
  - Asignado al tenant de la invitación
  - Role: según invitación (corporativo/gerente/empleado)
  ↓
Usuario accede a /tools (del tenant específico)
```

### 3. Sistema de Invitaciones

#### Tabla: `organization_invitations`
```sql
CREATE TABLE organization_invitations (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES companies(id),  -- Tenant específico
  email text NOT NULL,
  role user_role NOT NULL,  -- corporativo/gerente/empleado
  department text,
  area_id uuid,  -- Opcional: área específica
  token text UNIQUE NOT NULL,  -- Token seguro para aceptación
  status text NOT NULL,  -- pending/accepted/expired/cancelled
  invited_by uuid REFERENCES profiles(id),
  expires_at timestamp NOT NULL,  -- Expira en 7 días
  accepted_at timestamp,
  created_at timestamp DEFAULT now()
);
```

#### Flujo de Invitación:
1. **Corporativo/Gerente** crea invitación desde UI
2. Sistema genera token único
3. Email enviado con link: `https://app.com/invite/[token]`
4. Usuario acepta → profile creado en **ese tenant específico**

### 4. Múltiples Tenants por Usuario (Futuro)

**Por ahora**: 1 usuario = 1 tenant
**Futuro**: Usuario puede pertenecer a múltiples organizaciones
- Selector de organización en UI
- Context de "organización actual"

---

## 📊 Arquitectura de Datos

### Modelo Actualizado

```
┌────────────────────────────────┐
│         companies              │
│  (1 por tenant/organización)   │
├────────────────────────────────┤
│ id: uuid (tenant_id)           │
│ name: "Empresa XYZ"            │
│ slug: "empresa-xyz"            │
│ created_by: uuid               │
└─────────────┬──────────────────┘
              │
              │ 1:N
              ▼
┌────────────────────────────────┐
│         profiles               │
│  (usuarios del tenant)         │
├────────────────────────────────┤
│ id: uuid (Stack Auth user)     │
│ email: text                    │
│ company_id: uuid               │ ◄── Tenant específico
│ tenant_id: uuid                │ ◄── = company_id
│ role: corporativo/gerente/emp  │
│ department: text               │
└────────────────────────────────┘

┌────────────────────────────────┐
│  organization_invitations      │
│  (invitaciones por tenant)     │
├────────────────────────────────┤
│ id: uuid                       │
│ organization_id: uuid          │ ◄── Tenant que invita
│ email: text                    │
│ role: user_role                │
│ token: text (único)            │
│ status: pending/accepted       │
│ invited_by: uuid               │
│ expires_at: timestamp          │
└────────────────────────────────┘

┌────────────────────────────────┐
│    objectives, initiatives,    │
│    activities, etc.            │
├────────────────────────────────┤
│ tenant_id: uuid                │ ◄── Datos del tenant
│ ...                            │
└────────────────────────────────┘
```

### Relaciones Clave:

1. **companies.created_by** → primer usuario (corporativo)
2. **profiles.company_id** → organización del usuario
3. **profiles.tenant_id** = **profiles.company_id** (mismo valor)
4. **organization_invitations.organization_id** → tenant que invita
5. Todos los datos (objectives, etc.) tienen **tenant_id**

---

## 🔧 Implementación

### Fase 1: Base de Datos

#### 1.1 Actualizar tabla companies
```sql
ALTER TABLE companies
ADD COLUMN created_by uuid REFERENCES profiles(id);

COMMENT ON COLUMN companies.created_by IS
'Primer usuario (corporativo) que creó la organización';
```

#### 1.2 Crear tabla organization_invitations
```sql
CREATE TABLE organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role user_role NOT NULL,
  department text,
  area_id uuid,
  token text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL REFERENCES profiles(id),
  custom_message text,
  expires_at timestamp NOT NULL,
  accepted_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),

  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_invitations_org ON organization_invitations(organization_id);
CREATE INDEX idx_invitations_email ON organization_invitations(email);
CREATE INDEX idx_invitations_token ON organization_invitations(token);
CREATE INDEX idx_invitations_status ON organization_invitations(status);
```

#### 1.3 Función para expirar invitaciones
```sql
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE organization_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;
```

---

### Fase 2: Servicios de Backend

#### 2.1 Organization Service (`lib/organization/service.ts`)

```typescript
export class OrganizationService {

  /**
   * Crear nueva organización (primer usuario)
   * Usuario que crea se convierte en corporativo
   */
  async createOrganization(data: {
    userId: string;
    userEmail: string;
    userName: string;
    organizationName: string;
    industry?: string;
  }) {
    // 1. Crear organización
    const [org] = await db.insert(companies).values({
      name: data.organizationName,
      slug: slugify(data.organizationName),
      createdBy: data.userId,  // Marcamos quién creó
    }).returning();

    // 2. Crear profile del usuario (corporativo)
    const [profile] = await db.insert(profiles).values({
      id: data.userId,
      email: data.userEmail,
      fullName: data.userName,
      role: 'corporativo',
      department: 'General',
      companyId: org.id,
      tenantId: org.id,  // tenant_id = company_id
    }).returning();

    return { organization: org, profile };
  }

  /**
   * Crear invitación para unirse a organización
   * Solo corporativo o gerente pueden invitar
   */
  async createInvitation(data: {
    organizationId: string;
    invitedBy: string;
    email: string;
    role: 'corporativo' | 'gerente' | 'empleado';
    department?: string;
    areaId?: string;
    customMessage?: string;
  }) {
    // 1. Verificar que invitador tiene permiso
    const inviter = await db.query.profiles.findFirst({
      where: and(
        eq(profiles.id, data.invitedBy),
        eq(profiles.companyId, data.organizationId)
      ),
    });

    if (!inviter || !['corporativo', 'gerente'].includes(inviter.role)) {
      throw new Error('No tienes permiso para invitar usuarios');
    }

    // 2. Verificar que email no está ya en la organización
    const existing = await db.query.profiles.findFirst({
      where: and(
        eq(profiles.email, data.email),
        eq(profiles.companyId, data.organizationId)
      ),
    });

    if (existing) {
      throw new Error('Usuario ya pertenece a esta organización');
    }

    // 3. Verificar que no hay invitación pendiente
    const pendingInvite = await db.query.organizationInvitations.findFirst({
      where: and(
        eq(organizationInvitations.email, data.email),
        eq(organizationInvitations.organizationId, data.organizationId),
        eq(organizationInvitations.status, 'pending')
      ),
    });

    if (pendingInvite) {
      throw new Error('Ya existe una invitación pendiente para este email');
    }

    // 4. Generar token seguro
    const token = crypto.randomBytes(32).toString('hex');

    // 5. Crear invitación
    const [invitation] = await db.insert(organizationInvitations).values({
      organizationId: data.organizationId,
      email: data.email,
      role: data.role,
      department: data.department,
      areaId: data.areaId,
      token,
      invitedBy: data.invitedBy,
      customMessage: data.customMessage,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
      status: 'pending',
    }).returning();

    // 6. Enviar email (Brevo)
    await this.sendInvitationEmail({
      to: data.email,
      organizationName: inviter.company.name,
      inviterName: inviter.fullName,
      role: data.role,
      token,
      customMessage: data.customMessage,
    });

    return invitation;
  }

  /**
   * Validar y obtener info de invitación
   */
  async validateInvitation(token: string) {
    const invitation = await db.query.organizationInvitations.findFirst({
      where: eq(organizationInvitations.token, token),
      with: {
        organization: true,
        inviter: true,
      },
    });

    if (!invitation) {
      throw new Error('Invitación no encontrada');
    }

    if (invitation.status !== 'pending') {
      throw new Error(`Invitación ${invitation.status}`);
    }

    if (new Date() > invitation.expiresAt) {
      await db.update(organizationInvitations)
        .set({ status: 'expired' })
        .where(eq(organizationInvitations.id, invitation.id));
      throw new Error('Invitación expirada');
    }

    return invitation;
  }

  /**
   * Aceptar invitación y crear profile
   */
  async acceptInvitation(data: {
    token: string;
    userId: string;
    userName: string;
  }) {
    // 1. Validar invitación
    const invitation = await this.validateInvitation(data.token);

    // 2. Verificar que el email del usuario coincide
    const user = await stackServerApp.getUser({ id: data.userId });
    if (user.primaryEmail !== invitation.email) {
      throw new Error('El email no coincide con la invitación');
    }

    // 3. Crear profile en la organización
    const [profile] = await db.insert(profiles).values({
      id: data.userId,
      email: invitation.email,
      fullName: data.userName,
      role: invitation.role,
      department: invitation.department || 'General',
      areaId: invitation.areaId,
      companyId: invitation.organizationId,
      tenantId: invitation.organizationId,  // tenant_id = org_id
    }).returning();

    // 4. Marcar invitación como aceptada
    await db.update(organizationInvitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
      })
      .where(eq(organizationInvitations.id, invitation.id));

    // 5. Notificar al invitador
    await this.sendAcceptanceNotification({
      to: invitation.inviter.email,
      userName: data.userName,
      organizationName: invitation.organization.name,
    });

    return profile;
  }
}
```

---

### Fase 3: Flujo de Autenticación Actualizado

#### 3.1 Auth Service (`lib/auth.ts`)

```typescript
export async function ensureAuthenticated() {
  const user = await stackServerApp.getUser({ or: 'redirect' });

  // Verificar email verificado
  const isVerified = await user.primaryEmailVerified;
  if (!isVerified) {
    redirect(stackServerApp.urls.emailVerification);
  }

  // Verificar si usuario tiene perfil
  let profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
    with: { company: true },
  });

  if (profile) {
    // Usuario ya tiene organización
    return { user, profile };
  }

  // Usuario nuevo - verificar si tiene invitación pendiente
  const pendingInvitation = await db.query.organizationInvitations.findFirst({
    where: and(
      eq(organizationInvitations.email, user.primaryEmail),
      eq(organizationInvitations.status, 'pending'),
      gte(organizationInvitations.expiresAt, new Date())
    ),
    with: { organization: true },
  });

  if (pendingInvitation) {
    // Redirigir a aceptar invitación
    redirect(`/invite/${pendingInvitation.token}`);
  }

  // No tiene invitación - redirigir a crear organización
  redirect('/onboarding/create');
}
```

---

### Fase 4: UI de Onboarding

#### 4.1 Crear Organización (`app/onboarding/create/page.tsx`)

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';

export default function CreateOrganizationPage() {
  const user = useUser({ or: 'redirect' });
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    organizationName: '',
    industry: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: form.organizationName,
          industry: form.industry,
        }),
      });

      if (!response.ok) throw new Error('Failed to create organization');

      // Redirigir a /tools
      router.push('/tools');
    } catch (error) {
      console.error(error);
      alert('Error al crear organización');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Crea tu Organización</CardTitle>
          <CardDescription>
            Comienza configurando tu espacio de trabajo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="org-name">Nombre de la Organización</Label>
              <Input
                id="org-name"
                value={form.organizationName}
                onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                placeholder="Mi Empresa S.A."
                required
              />
            </div>

            <div>
              <Label htmlFor="industry">Industria</Label>
              <Select
                value={form.industry}
                onValueChange={(value) => setForm({ ...form, industry: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una industria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">Tecnología</SelectItem>
                  <SelectItem value="finance">Finanzas</SelectItem>
                  <SelectItem value="healthcare">Salud</SelectItem>
                  <SelectItem value="education">Educación</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="other">Otra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Organización'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 4.2 Aceptar Invitación (`app/invite/[token]/page.tsx`)

```tsx
import { notFound, redirect } from 'next/navigation';
import { validateInvitation } from '@/lib/organization/service';
import { AcceptInvitationForm } from '@/components/onboarding/AcceptInvitationForm';

export default async function InvitationPage({
  params,
}: {
  params: { token: string };
}) {
  try {
    const invitation = await validateInvitation(params.token);

    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Te invitaron a {invitation.organization.name}</CardTitle>
            <CardDescription>
              {invitation.inviter.fullName} te invitó a unirte como {invitation.role}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  <strong>Organización:</strong> {invitation.organization.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Rol asignado:</strong> {invitation.role}
                </p>
                {invitation.department && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Departamento:</strong> {invitation.department}
                  </p>
                )}
              </div>

              {invitation.customMessage && (
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm">{invitation.customMessage}</p>
                </div>
              )}

              <AcceptInvitationForm token={params.token} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
```

#### 4.3 Panel de Invitaciones (`app/tools/admin/invitations/page.tsx`)

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';
import { InvitationsTable } from '@/components/admin/InvitationsTable';

export default function InvitationsPage() {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Invitaciones</h1>
        <Button onClick={() => setShowDialog(true)}>
          Invitar Usuario
        </Button>
      </div>

      <InvitationsTable />
      <InviteUserDialog open={showDialog} onOpenChange={setShowDialog} />
    </div>
  );
}
```

---

### Fase 5: API Endpoints

#### 5.1 POST /api/organizations (Crear organización)
```typescript
export async function POST(request: Request) {
  const user = await stackServerApp.getUser({ or: 'throw' });
  const data = await request.json();

  const orgService = new OrganizationService();
  const result = await orgService.createOrganization({
    userId: user.id,
    userEmail: user.primaryEmail,
    userName: user.displayName,
    organizationName: data.organizationName,
    industry: data.industry,
  });

  return Response.json(result);
}
```

#### 5.2 POST /api/invitations (Crear invitación)
```typescript
export async function POST(request: Request) {
  const user = await stackServerApp.getUser({ or: 'throw' });
  const { profile } = await ensureAuthenticated();
  const data = await request.json();

  const orgService = new OrganizationService();
  const invitation = await orgService.createInvitation({
    organizationId: profile.companyId,
    invitedBy: user.id,
    email: data.email,
    role: data.role,
    department: data.department,
    areaId: data.areaId,
    customMessage: data.customMessage,
  });

  return Response.json(invitation);
}
```

#### 5.3 POST /api/invitations/accept (Aceptar invitación)
```typescript
export async function POST(request: Request) {
  const user = await stackServerApp.getUser({ or: 'throw' });
  const { token } = await request.json();

  const orgService = new OrganizationService();
  const profile = await orgService.acceptInvitation({
    token,
    userId: user.id,
    userName: user.displayName,
  });

  return Response.json(profile);
}
```

---

## 🔒 Row Level Security

Las políticas RLS ya están listas en `drizzle/0005_rls_policies.sql`.

**Importante**: Cada tenant solo ve SUS datos gracias a:
```sql
CREATE POLICY "objectives_select_policy" ON objectives
FOR SELECT
USING (tenant_id = auth.user_tenant_id());
```

La función `auth.user_tenant_id()` obtiene el tenant_id del profile del usuario autenticado.

---

## 📋 Checklist de Implementación

### Base de Datos
- [ ] Agregar `created_by` a `companies`
- [ ] Crear tabla `organization_invitations`
- [ ] Aplicar RLS policies

### Backend
- [ ] Crear `OrganizationService` completo
- [ ] Actualizar `ensureAuthenticated()`
- [ ] API endpoints (organizations, invitations)

### Frontend
- [ ] UI: Crear organización (`/onboarding/create`)
- [ ] UI: Aceptar invitación (`/invite/[token]`)
- [ ] UI: Panel de invitaciones (`/tools/admin/invitations`)
- [ ] Componentes: Formularios y tablas

### Integración
- [ ] Configurar Brevo para emails
- [ ] Templates de email (invitación, aceptación)
- [ ] Testing completo del flujo

---

## ⏱️ Estimación

- Base de datos: 1-2 horas
- Backend services: 3-4 horas
- Frontend UI: 4-5 horas
- Integración Brevo: 2-3 horas
- Testing: 2-3 horas

**Total**: ~15-20 horas

---

## ✅ Resultado Final

### Usuario que crea organización:
1. Sign up → `/onboarding/create`
2. Ingresa nombre de empresa
3. Sistema crea org + profile (corporativo)
4. Accede a `/tools` de SU tenant

### Usuario invitado:
1. Recibe email con link
2. Click → `/invite/[token]`
3. Ve info de la organización
4. Acepta → profile creado en ESE tenant
5. Accede a `/tools` de ESE tenant

### Aislamiento:
- Tenant A no ve datos de Tenant B (RLS enforced)
- Invitaciones son específicas por tenant
- Cada tenant totalmente independiente

¿Procedo con esta implementación?
