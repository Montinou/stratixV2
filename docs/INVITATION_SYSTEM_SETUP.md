# Sistema de Invitaciones con Brevo - Guía de Configuración

## Resumen

Sistema completo de invitaciones organizacionales que permite a administradores invitar miembros del equipo usando Brevo para envío confiable de emails. Incluye gestión de estados, tracking de aceptaciones, recordatorios automáticos y asignación inteligente de roles.

## Características Implementadas

### ✅ Backend
- ✅ Servicio completo de Brevo con retry logic
- ✅ Templates de email en español (invitación, recordatorio, bienvenida)
- ✅ API endpoints CRUD para invitaciones
- ✅ Sistema de estadísticas
- ✅ Validación y permisos por rol
- ✅ Paginación y filtros

### ✅ Frontend
- ✅ Dashboard de invitaciones con estadísticas
- ✅ Formulario para envío masivo
- ✅ Tabla de gestión con filtros y búsqueda
- ✅ Acciones: reenviar, cancelar
- ✅ Alertas para invitaciones por expirar

### ✅ Automatización
- ✅ Cron jobs para recordatorios (3 y 7 días)
- ✅ Limpieza automática de invitaciones expiradas
- ✅ Webhook de Brevo para tracking

## Configuración Requerida

### 1. Variables de Entorno

Agregar a `.env.local`:

```bash
# Brevo Configuration
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxx
BREVO_SENDER_EMAIL=noreply@stratix.com
BREVO_SENDER_NAME=Stratix OKR Platform

# Cron Jobs (Production only)
CRON_SECRET=tu-secreto-para-cron-jobs
```

### 2. Configurar Cuenta de Brevo

1. **Crear cuenta en Brevo** (https://www.brevo.com/)
2. **Obtener API Key**:
   - Ir a Settings → SMTP & API → API Keys
   - Crear nueva API key con permisos de "Transactional emails"
   - Copiar la key a `BREVO_API_KEY`

3. **Verificar dominio** (opcional pero recomendado):
   - Settings → Senders & IP
   - Agregar y verificar tu dominio
   - Esto mejora la deliverability

4. **Configurar Webhooks** (opcional para tracking):
   - Settings → Webhooks
   - Crear webhook apuntando a: `https://tu-dominio.com/api/webhooks/brevo`
   - Seleccionar eventos: `sent`, `delivered`, `opened`, `click`, `hardBounce`, `softBounce`

### 3. Configurar Cron Jobs en Vercel

El archivo `vercel.json` ya está configurado con:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-invitations",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/invitation-reminders",
      "schedule": "0 10 * * *"
    }
  ]
}
```

**Schedules:**
- `cleanup-invitations`: Diario a las 00:00 (medianoche)
- `invitation-reminders`: Diario a las 10:00 AM

**Configurar CRON_SECRET en Vercel:**
```bash
vercel env add CRON_SECRET
```

## Estructura de Archivos

```
├── lib/services/brevo/
│   ├── client.ts              # Cliente Brevo con retry logic
│   ├── email-sender.ts        # Servicio de envío de emails
│   ├── templates.ts           # Templates HTML de emails
│   └── index.ts              # Exports
│
├── app/api/invitations/
│   ├── route.ts              # POST (enviar), GET (listar)
│   ├── [id]/
│   │   ├── route.ts          # DELETE (cancelar)
│   │   └── resend/route.ts   # PUT (reenviar)
│   └── stats/route.ts        # GET (estadísticas)
│
├── app/api/cron/
│   ├── cleanup-invitations/route.ts   # Limpieza diaria
│   └── invitation-reminders/route.ts  # Recordatorios
│
├── app/api/webhooks/
│   └── brevo/route.ts        # Webhook de eventos
│
└── components/admin/invitations/
    ├── InvitationController.tsx  # Controlador principal
    ├── InvitationForm.tsx        # Formulario de envío
    ├── InvitationsTable.tsx      # Tabla de gestión
    └── InvitationStats.tsx       # Dashboard de métricas
```

## API Endpoints

### POST /api/invitations
Enviar invitaciones a uno o más emails.

**Request:**
```json
{
  "emails": ["user1@company.com", "user2@company.com"],
  "role": "empleado",
  "organizationId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2 invitations sent successfully",
  "results": [...],
  "stats": { "sent": 2, "failed": 0, "total": 2 }
}
```

### GET /api/invitations
Listar invitaciones con filtros.

**Query params:**
- `organizationId` (optional): UUID de la organización
- `status` (optional): pending | accepted | expired | revoked
- `search` (optional): Buscar por email
- `page` (default: 1): Número de página
- `limit` (default: 20): Resultados por página

### PUT /api/invitations/[id]/resend
Reenviar invitación.

**Body (optional):**
```json
{
  "reminder": true  // true = recordatorio, false = invitación completa
}
```

### DELETE /api/invitations/[id]
Cancelar invitación pendiente.

### GET /api/invitations/stats
Obtener estadísticas de invitaciones.

**Query params:**
- `organizationId` (optional): UUID de la organización

## Flujo de Usuario

### Administrador
1. Accede a `/tools/admin`
2. Ve el dashboard de invitaciones con estadísticas
3. Ingresa emails (uno o múltiples) y selecciona rol
4. Click en "Send Invitations"
5. Ve la tabla con todas las invitaciones
6. Puede:
   - Buscar por email
   - Filtrar por estado
   - Reenviar invitaciones pendientes
   - Cancelar invitaciones

### Usuario Invitado
1. Recibe email con link de invitación
2. Click en "Aceptar Invitación"
3. Es redirigido a `/invite/[token]`
4. Ve detalles de la invitación (organización, rol)
5. Click en "Accept Invitation"
6. Se crea su perfil y se une a la organización
7. Recibe email de bienvenida
8. Es redirigido a `/tools`

### Recordatorios Automáticos
- **Día 7**: Primer recordatorio (si no ha aceptado)
- **Día 3**: Segundo recordatorio (últimos días)
- **Día 0**: Invitación expira automáticamente

## Templates de Email

### 1. Invitación Inicial
- Asunto: "Invitación para unirte a [Organización]"
- Contenido:
  - Información de la organización
  - Rol asignado
  - Quién invitó
  - Fecha de expiración
  - CTA: "Aceptar Invitación"

### 2. Recordatorio
- Asunto: "Recordatorio: Invitación a [Organización] (expira en X días)"
- Contenido:
  - Alerta de expiración próxima
  - Días restantes
  - Misma información de invitación
  - CTA: "Aceptar Invitación Ahora"

### 3. Bienvenida
- Asunto: "¡Bienvenido a [Organización]!"
- Contenido:
  - Confirmación de unión
  - Próximos pasos
  - Link a la plataforma

## Permisos y Roles

### Quién puede enviar invitaciones:
- ✅ Corporativo (Corporate Administrator)
- ✅ Gerente (Manager)
- ❌ Empleado (Employee)

### Roles disponibles para asignar:
- **Corporativo**: Acceso completo a toda la organización
- **Gerente**: Gestión de equipo y OKRs
- **Empleado**: Vista y gestión de OKRs personales

## Limitaciones y Consideraciones

### Rate Limiting
- Máximo 50 emails por batch
- Brevo tiene límites diarios según el plan
- El cliente implementa retry logic para rate limits

### Expiración
- Las invitaciones expiran en 7 días por defecto
- Se pueden modificar en `organization-service.ts`:
  ```typescript
  expiresAt.setDate(expiresAt.getDate() + 7); // Cambiar el número
  ```

### Seguridad
- Tokens únicos y seguros (base64url random)
- Validación de permisos en todos los endpoints
- Verificación de expiración antes de aceptar
- CRON_SECRET para proteger endpoints de cron

## Testing

### Test Manual del Flujo

1. **Enviar Invitación:**
```bash
curl -X POST http://localhost:3000/api/invitations \
  -H "Content-Type: application/json" \
  -d '{
    "emails": ["test@example.com"],
    "role": "empleado",
    "organizationId": "tu-org-id"
  }'
```

2. **Listar Invitaciones:**
```bash
curl http://localhost:3000/api/invitations?organizationId=tu-org-id
```

3. **Estadísticas:**
```bash
curl http://localhost:3000/api/invitations/stats?organizationId=tu-org-id
```

4. **Trigger Cron (Development):**
```bash
# Cleanup
curl http://localhost:3000/api/cron/cleanup-invitations

# Reminders
curl http://localhost:3000/api/cron/invitation-reminders
```

### Verificar Emails en Brevo

1. Ir a Brevo Dashboard → Transactional → Logs
2. Buscar emails enviados
3. Ver estado de entrega
4. Ver eventos (aperturas, clicks)

## Troubleshooting

### Emails no se envían
1. Verificar `BREVO_API_KEY` es correcta
2. Verificar límites de Brevo no excedidos
3. Revisar logs en Brevo Dashboard
4. Verificar dominio de sender está verificado

### Cron jobs no ejecutan
1. Verificar `vercel.json` está en root
2. Verificar deployment en Vercel
3. Verificar `CRON_SECRET` configurado
4. Ver logs en Vercel Dashboard

### Invitaciones no expiran
1. Verificar cron job de cleanup está ejecutando
2. Ejecutar manualmente: `GET /api/cron/cleanup-invitations`
3. Revisar logs del cron job

## Mejoras Futuras

- [ ] Batch email processing con queue
- [ ] Analytics de tasa de apertura/clicks
- [ ] Templates personalizables por organización
- [ ] Invitaciones masivas via CSV
- [ ] Notificaciones al admin cuando aceptan
- [ ] Sistema de aprobación de invitaciones
- [ ] Integración con Slack/Teams para notificaciones

## Soporte

Para problemas o preguntas:
1. Revisar logs en Vercel Dashboard
2. Revisar logs de Brevo Dashboard
3. Verificar configuración de variables de entorno
4. Contactar al equipo de desarrollo
