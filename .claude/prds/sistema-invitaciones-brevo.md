---
name: sistema-invitaciones-brevo
description: Sistema completo de invitaciones organizacionales usando Brevo para envío de emails y gestión de aceptaciones
status: backlog
created: 2025-09-27T05:49:52Z
parent_prd: onboarding-org-creation
priority: medium
---

# PRD: Sistema de Invitaciones con Brevo

## Resumen Ejecutivo

Sistema robusto de invitaciones organizacionales que permite a administradores invitar miembros del equipo usando Brevo para envío confiable de emails. Incluye gestión de estados, tracking de aceptaciones, recordatorios automáticos y asignación inteligente de roles.

## Declaración del Problema

**Problemas Actuales:**
- No existe sistema de invitaciones para nuevos miembros de organización
- Falta proceso estructurado para onboarding de miembros invitados
- Ausencia de tracking del estado de invitaciones
- No hay automatización para recordatorios

**Impacto en el Negocio:**
- Organizaciones no pueden crecer eficientemente
- Proceso manual propenso a errores
- Baja tasa de aceptación por falta de seguimiento
- Experiencia fragmentada para nuevos miembros

## Historias de Usuario

### Usuario Principal: Administrador Corporativo

```
Como administrador corporativo,
Quiero invitar miembros de mi equipo a la organización de manera simple y confiable,
Para que puedan unirse y comenzar a colaborar en nuestros OKRs.

Criterios de Aceptación:
- [ ] Formulario simple para invitar múltiples usuarios (emails + roles)
- [ ] Envío automático de emails usando Brevo
- [ ] Tracking del estado de cada invitación
- [ ] Recordatorios automáticos para invitaciones pendientes
- [ ] Notificaciones cuando alguien acepta la invitación
```

### Usuario Secundario: Miembro Invitado

```
Como persona invitada a una organización,
Quiero recibir un email claro con información sobre la organización y cómo unirme,
Para entender el contexto y completar mi registro fácilmente.

Criterios de Aceptación:
- [ ] Email con información clara de la organización y mi rol
- [ ] Link directo para aceptar invitación
- [ ] Proceso de registro guiado específico para invitados
- [ ] Confirmación automática al completar registro
```

## Requerimientos Funcionales

### RF-1: Interfaz de Invitaciones (Admin)
- **RF-1.1**: Formulario para invitar múltiples usuarios (textarea con emails)
- **RF-1.2**: Selector de rol por defecto (Corporativo/Gerente/Empleado)
- **RF-1.3**: Selector de departamento por defecto
- **RF-1.4**: Campo opcional para mensaje personalizado
- **RF-1.5**: Vista previa del email antes de enviar
- **RF-1.6**: Validación de formato de emails
- **RF-1.7**: Detección y manejo de emails duplicados

### RF-2: Gestión de Estados de Invitación
- **RF-2.1**: Estados: Pendiente, Enviada, Vista, Aceptada, Expirada, Cancelada
- **RF-2.2**: Dashboard de invitaciones con filtros por estado
- **RF-2.3**: Búsqueda por email o nombre
- **RF-2.4**: Acciones bulk (reenviar, cancelar múltiples)
- **RF-2.5**: Historial de acciones por invitación
- **RF-2.6**: Exportación de lista de invitaciones

### RF-3: Integración con Brevo
- **RF-3.1**: Configuración automática usando variables de entorno existentes
- **RF-3.2**: Templates de email personalizables en Brevo
- **RF-3.3**: Envío usando Brevo Transactional API
- **RF-3.4**: Tracking de entrega y apertura via Brevo webhooks
- **RF-3.5**: Manejo de errores de envío con reintentos
- **RF-3.6**: Rate limiting para cumplir límites de Brevo

### RF-4: Proceso de Aceptación
- **RF-4.1**: Landing page personalizada para invitaciones
- **RF-4.2**: Validación de token de invitación válido/no expirado
- **RF-4.3**: Información contextual de la organización
- **RF-4.4**: Botón "Aceptar Invitación" que redirige a registro
- **RF-4.5**: Pre-llenado de información en formulario de registro
- **RF-4.6**: Asignación automática de rol y departamento al completar

### RF-5: Automatización y Recordatorios
- **RF-5.1**: Recordatorio automático después de 3 días (configurable)
- **RF-5.2**: Segundo recordatorio después de 7 días
- **RF-5.3**: Expiración automática después de 14 días
- **RF-5.4**: Notificaciones al admin cuando alguien acepta
- **RF-5.5**: Notificaciones de expiración próxima
- **RF-5.6**: Configuración de intervalos de recordatorio por organización

### RF-6: Templates de Email
- **RF-6.1**: Template base en español para invitaciones
- **RF-6.2**: Personalización con nombre de organización y rol
- **RF-6.3**: Template para recordatorios (diferente al inicial)
- **RF-6.4**: Template de bienvenida post-aceptación
- **RF-6.5**: Variables dinámicas: {{organization_name}}, {{role}}, {{inviter_name}}
- **RF-6.6**: Diseño responsivo para móviles

## Requerimientos No Funcionales

### RNF-1: Confiabilidad
- **RNF-1.1**: 99.5% de emails entregados exitosamente
- **RNF-1.2**: Reintentos automáticos en caso de falla temporal
- **RNF-1.3**: Queue system para envío masivo
- **RNF-1.4**: Backup de invitaciones en base de datos

### RNF-2: Rendimiento
- **RNF-2.1**: Envío de hasta 100 invitaciones en batch
- **RNF-2.2**: Procesamiento de batch en < 30 segundos
- **RNF-2.3**: Dashboard de invitaciones carga en < 2 segundos
- **RNF-2.4**: Rate limiting: máximo 50 invitaciones/hora por admin

### RNF-3: Seguridad
- **RNF-3.1**: Tokens de invitación únicos y seguros (JWT)
- **RNF-3.2**: Expiración obligatoria de tokens (14 días máximo)
- **RNF-3.3**: Validación de permisos antes de enviar invitaciones
- **RNF-3.4**: Rate limiting para prevenir spam
- **RNF-3.5**: Logs de auditoría para todas las acciones

### RNF-4: Escalabilidad
- **RNF-4.1**: Soporte para organizaciones con +1000 miembros
- **RNF-4.2**: Queue system asíncrono para envío masivo
- **RNF-4.3**: Paginación en listado de invitaciones
- **RNF-4.4**: Índices de base de datos optimizados

## Criterios de Éxito

### Métricas Principales
- **Tasa de Entrega**: >99% de emails enviados exitosamente
- **Tasa de Aceptación**: >70% de invitaciones aceptadas en 14 días
- **Tiempo de Aceptación**: <24 horas promedio para primera respuesta
- **Satisfacción**: >4.5/5 en experiencia de invitación

### Métricas Operacionales
- **Tiempo de Envío**: <30 segundos para batch de 50 invitaciones
- **Disponibilidad**: >99.9% uptime del sistema
- **Errores de Envío**: <0.5% de fallos por problemas del sistema

## Configuración de Brevo

### Variables de Entorno Existentes
```bash
BREVO_API_KEY=xkeysib-xxxxx...
BREVO_SENDER_EMAIL=noreply@stratix.com
BREVO_SENDER_NAME=Stratix OKR Platform
```

### Setup Requerido
- **Templates en Brevo**: Crear templates con IDs específicos
- **Webhooks**: Configurar para tracking de eventos
- **Domain Verification**: Verificar dominio para mejor deliverability
- **SMTP Settings**: Configuración para respaldo

## Dependencias

### Internas
- Sistema de autenticación Stack Auth
- Base de datos para gestión de invitaciones
- Sistema de organizaciones y roles
- Frontend de onboarding (PRD separado)

### Externas
- **Brevo API**: Para envío de emails transaccionales
- **Brevo Webhooks**: Para tracking de eventos
- **Next.js API Routes**: Para endpoints del sistema
- **Vercel Cron Jobs**: Para recordatorios automáticos

## Esquema de Base de Datos

```sql
-- Tabla de invitaciones
CREATE TABLE invitations (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    inviter_id UUID REFERENCES users(id),
    email VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL,
    department VARCHAR(100),
    personal_message TEXT,
    status invitation_status_enum DEFAULT 'pending',
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de eventos de invitación
CREATE TABLE invitation_events (
    id UUID PRIMARY KEY,
    invitation_id UUID REFERENCES invitations(id),
    event_type VARCHAR(50) NOT NULL, -- sent, viewed, clicked, accepted, etc.
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Fuera del Alcance

- Integración con otros proveedores de email
- Sistema de aprobación de invitaciones
- Invitaciones masivas via CSV (v2)
- Personalización avanzada de templates
- Sistema de referidos o incentivos

## Fases de Implementación

### Fase 1: Core Sistema (Semana 1)
- Modelo de datos y API endpoints
- Integración básica con Brevo
- Interface de invitación simple
- Templates básicos de email

### Fase 2: Gestión Avanzada (Semana 2)
- Dashboard de gestión de invitaciones
- Sistema de estados y tracking
- Webhooks de Brevo para eventos
- Validaciones y seguridad

### Fase 3: Automatización (Semana 3)
- Sistema de recordatorios automáticos
- Configuración de intervalos
- Notificaciones al admin
- Optimización de rendimiento

### Fase 4: Pulimento (Semana 4)
- Templates avanzados con diseño
- Analytics y métricas
- Testing integral
- Documentación completa