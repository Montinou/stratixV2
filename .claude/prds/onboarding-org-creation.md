---
name: onboarding-org-creation
description: "[DIVIDIDO] Experiencia de incorporación - Ver PRDs específicos para implementación"
status: split
created: 2025-09-27T05:30:51Z
updated: 2025-09-27T05:49:52Z
split_into:
  - frontend-onboarding-ai
  - sistema-invitaciones-brevo
  - motor-ai-completo
---

# PRD: Incorporación de Organizaciones [DIVIDIDO]

> ⚠️ **ESTE PRD HA SIDO DIVIDIDO EN 3 PRDs ESPECÍFICOS**
>
> Para implementación, usar los PRDs individuales:

## PRDs de Implementación

### 1. [Frontend de Onboarding con AI](./frontend-onboarding-ai.md)
- **Scope**: Interfaz de usuario elegante para wizard de onboarding
- **Priority**: Alta - Base para toda la experiencia
- **Timeline**: 3 semanas
- **Dependencies**: Motor AI (PRD #3)

### 2. [Sistema de Invitaciones con Brevo](./sistema-invitaciones-brevo.md)
- **Scope**: Sistema completo de invitaciones usando Brevo
- **Priority**: Media - Funcionalidad independiente
- **Timeline**: 4 semanas
- **Dependencies**: Variables Brevo ya configuradas

### 3. [Motor de AI Completo](./motor-ai-completo.md)
- **Scope**: Foundation escalable de IA con Vercel AI Gateway + Gemini 2.0 Flash
- **Priority**: Alta - Backbone de funcionalidades inteligentes
- **Timeline**: 10 semanas
- **Dependencies**: AI_GATEWAY_API_KEY ya disponible

## Orden de Implementación Recomendado

1. **Fase 1**: Motor AI (Foundation) - Semanas 1-4
2. **Fase 2**: Frontend Onboarding (con AI) - Semanas 5-7
3. **Fase 3**: Sistema Invitaciones (paralelo) - Semanas 6-9

---

## Archivo Histórico (Referencia)

## Declaración del Problema

**Problemas Actuales:**
- Los nuevos usuarios se registran pero llegan a un dashboard vacío sin orientación
- Falta proceso estructurado para entender la jerarquía OKR
- Alta tasa de abandono por complejidad excesiva
- Sin aprovechamiento del potencial de IA para personalización

**Impacto en el Negocio:**
- Baja tasa de activación (<30% completan configuración)
- Tiempo excesivo hasta obtener valor inicial
- Pérdida de oportunidad para mostrar capacidades de IA desde el inicio

## User Stories

### Primary Personas

**1. Company Administrator (Corporate Role)**
- First-time user setting up their organization's OKR system
- Needs to understand the platform structure and configure their organization
- Responsible for inviting team members and setting initial permissions

**2. Team Lead (Manager Role)**
- Invited by administrator to join an existing organization
- Needs to understand their role and how to create/manage initiatives
- May need to invite their direct reports

**3. Team Member (Employee Role)**
- Invited to join organization and complete basic profile setup
- Needs simple onboarding focused on their specific role and permissions

### Detailed User Journeys

#### Journey 1: Creador de Organización (Admin Corporativo)
```
Como administrador corporativo creando una nueva organización,
Quiero un proceso de configuración asistido por IA que sea simple y efectivo,
Para establecer mi organización y crear mis primeros OKRs en menos de 5 minutos.

Criterios de Aceptación:
- [ ] Bienvenida con propuesta de valor clara (30 segundos)
- [ ] Configuración de organización con sugerencias de IA (2 minutos)
- [ ] Creación de primer OKR con plantillas inteligentes (2 minutos)
- [ ] Invitaciones de equipo simplificadas (30 segundos opcional)
```

#### Journey 2: Invited Team Member
```
As an invited team member joining an existing organization,
I want a simple onboarding that explains my role and permissions,
So that I can start contributing to organizational objectives immediately.

Acceptance Criteria:
- [ ] Email invitation with clear call-to-action
- [ ] Role-specific welcome message and capabilities overview
- [ ] Profile completion with relevant fields for their role
- [ ] Quick tutorial on creating/managing activities (for employees)
- [ ] Direct access to assigned objectives/initiatives
```

#### Journey 3: Manager Joining Organization
```
As a manager invited to an organization,
I want to understand both my individual contribution and team leadership responsibilities,
So that I can effectively manage initiatives and guide my team.

Acceptance Criteria:
- [ ] Role explanation covering both personal and team management aspects
- [ ] Initiative creation tutorial with best practices
- [ ] Team member invitation capability (if applicable)
- [ ] Overview of progress tracking and reporting features
```

## Requirements

### Requerimientos Funcionales

#### RF-1: Flujo de Bienvenida Inteligente (30 segundos)
- **RF-1.1**: Pantalla de bienvenida con propuesta de valor clara en español
- **RF-1.2**: Demostración visual de 3 pasos del onboarding
- **RF-1.3**: Opción de "Comenzar ahora" o "Ver demo rápida"

#### RF-2: Configuración de Organización con IA (2 minutos)
- **RF-2.1**: Formulario mínimo (nombre empresa, industria)
- **RF-2.2**: IA sugiere estructura departamental basada en industria (Gemini 2.0 Flash)
- **RF-2.3**: Auto-configuración de ciclos OKR recomendados
- **RF-2.4**: Vista previa del dashboard personalizado generado por IA

#### RF-3: Creación de Primer OKR con Asistencia IA (2 minutos)
- **RF-3.1**: IA genera plantillas OKR específicas para la industria (Vercel AI Gateway + Gemini 2.0 Flash)
- **RF-3.2**: Editor conversacional para definir objetivos con chat IA
- **RF-3.3**: Sugerencias automáticas de métricas e iniciativas en tiempo real
- **RF-3.4**: Validación inteligente de completitud y claridad con feedback de IA

#### RF-4: Invitaciones Simplificadas (30 segundos - opcional)
- **RF-4.1**: Campo simple de emails separados por coma
- **RF-4.2**: Asignación automática de roles por IA (Gemini 2.0 Flash)
- **RF-4.3**: Plantilla de email personalizada por organización generada por IA

#### RF-5: Dashboard Inmediato
- **RF-5.1**: Redirección automática a dashboard poblado con datos de ejemplo
- **RF-5.2**: Tutorial contextual con puntos clave (skippeable)
- **RF-5.3**: Centro de ayuda IA integrado con chat conversacional (Vercel AI Gateway)

### Non-Functional Requirements

#### NFR-1: Performance
- **NFR-1.1**: Onboarding pages load in <2 seconds
- **NFR-1.2**: Email invitations sent within 30 seconds
- **NFR-1.3**: Bulk invitation processing supports up to 100 emails simultaneously
- **NFR-1.4**: Real-time progress updates without page refresh

#### RNF-2: Usabilidad
- **RNF-2.1**: Diseño responsivo elegante para móviles
- **RNF-2.2**: Cumplimiento de accesibilidad (WCAG 2.1 AA)
- **RNF-2.3**: Interfaz completamente en español
- **RNF-2.4**: Navegación por teclado y asistencia por voz

#### NFR-3: Security
- **NFR-3.1**: Invitation tokens expire after 7 days
- **NFR-3.2**: Rate limiting on invitation sending (max 20/hour per user)
- **NFR-3.3**: Email validation before invitation sending
- **NFR-3.4**: Secure token generation for invitation links

#### NFR-4: Reliability
- **NFR-4.1**: 99.9% uptime for onboarding flow
- **NFR-4.2**: Graceful degradation if email service is unavailable
- **NFR-4.3**: Auto-save of partial onboarding progress
- **NFR-4.4**: Comprehensive error handling with user-friendly messages

## Success Criteria

### Métricas Principales
- **Tasa de Activación**: >90% de usuarios registrados completan configuración
- **Tiempo hasta Primer Valor**: <5 minutos desde registro hasta primer OKR creado
- **Tasa de Finalización**: >95% de usuarios completan flujo de onboarding
- **Satisfacción con IA**: >4.7/5 en utilidad de asistencia inteligente

### Secondary Metrics
- **User Satisfaction**: >4.5/5 rating on onboarding experience survey
- **Support Ticket Reduction**: 60% decrease in setup-related support requests
- **Feature Discovery**: >80% of onboarded users use core features within first week
- **Team Setup Speed**: Organizations with 5+ members setup in <24 hours

### Engagement Metrics
- **First Week Retention**: >80% of onboarded users return within 7 days
- **OKR Creation Rate**: >60% of organizations create at least 3 objectives in first month
- **Collaborative Usage**: >50% of teams have multiple active users within first week

## Constraints & Assumptions

### Technical Constraints
- Must integrate with existing Stack Auth authentication system
- Database schema changes limited to additive modifications only
- Email sending via existing Vercel/Next.js infrastructure
- Must maintain compatibility with current NeonDB PostgreSQL setup
- AI implementation must use Vercel AI Gateway with existing API key (AI_GATEWAY_API_KEY)
- Primary AI model: Gemini 2.0 Flash for cost optimization
- Follow AI Gateway Implementation Guide for all AI integrations

### Business Constraints
- Development timeline: 4-6 weeks maximum
- No budget for third-party onboarding tools
- Must support both desktop and mobile browsers
- Spanish language requirement for all user-facing content

### User Assumptions
- Users have basic understanding of OKR methodology or are willing to learn
- Organization creators have email addresses of team members
- Users have reliable internet connection for web-based onboarding
- Primary user base consists of Spanish-speaking business professionals

### Platform Assumptions
- Stack Auth invitation system can be extended for organization invites
- Current database schema supports required organization and user relationships
- Email delivery service is reliable and can handle bulk sending
- Vercel deployment can handle increased load during onboarding

## Out of Scope

### Características Explícitamente Excluidas
- **Analíticas Avanzadas**: Reportes complejos (epic separado)
- **Integraciones Externas**: Slack, Teams durante onboarding
- **Tutoriales en Video**: Solo contenido interactivo e IA
- **Personalización de Marca**: Opciones de white-label
- **Gestión de Roles Avanzada**: Más allá de Corporativo/Gerente/Empleado
- **Importación de Datos**: OKRs desde otros sistemas
- **Idiomas Adicionales**: Solo español completo

### Future Considerations
- API integrations with popular business tools
- Advanced user analytics and cohort tracking
- Gamification elements for onboarding completion
- Organization-specific customization options

## Dependencies

### Internal Dependencies
- **Authentication System**: Stack Auth integration must support invitation workflows
- **Database Team**: Schema updates for onboarding progress tracking
- **Email Infrastructure**: Reliable email sending service configuration
- **UI/UX Team**: Design system components for onboarding flows
- **Content Team**: Spanish copy for all onboarding content and help text
- **AI Infrastructure**: Vercel AI Gateway setup with Gemini 2.0 Flash model
- **AI Gateway Implementation**: Following @AI_GATEWAY_IMPLEMENTATION_GUIDE.md patterns

### External Dependencies
- **Stack Auth Service**: Platform availability and API stability
- **NeonDB**: Database performance during bulk user creation
- **Vercel Platform**: Deployment platform supporting onboarding features
- **Email Service Provider**: Delivery rates and reputation management
- **Browser Compatibility**: Modern browser support for interactive features
- **Vercel AI Gateway**: Service availability and API reliability
- **Google Gemini 2.0 Flash**: Model availability and performance through gateway
- **AI Gateway API**: Rate limits and cost management

### Integration Points
- User registration flow with Stack Auth
- Profile creation system with existing database schema
- Company management APIs for organization setup
- Role-based permission system integration
- Dashboard redirect after onboarding completion

## Fases de Implementación

### Fase 1: Fundación IA (Semana 1-2)
- Motor de sugerencias de IA para configuración organizacional (Vercel AI Gateway + Gemini 2.0 Flash)
- Generador de plantillas OKR inteligentes por industria usando AI_GATEWAY_API_KEY
- Interfaz de onboarding mínima y elegante en español
- Sistema de tracking de progreso simplificado
- Implementación de patrones del AI Gateway Implementation Guide

### Fase 2: Refinamiento (Semana 3-4)
- Editor conversacional para creación de OKRs
- Sistema de invitaciones con asignación automática de roles
- Dashboard personalizado con datos de ejemplo
- Optimización móvil y rendimiento

### Fase 3: Pulimento (Semana 5-6)
- Centro de ayuda IA integrado
- Métricas y analytics de onboarding
- Testing integral y optimización
- Validación de experiencia de usuario