---
name: frontend-onboarding-ai
status: backlog
created: 2025-09-27T05:55:57Z
progress: 0%
prd: .claude/prds/frontend-onboarding-ai.md
github: [Will be updated when synced to GitHub]
---

# Epic: Frontend de Onboarding con IA

## Overview

Implementación de interfaz frontend elegante para wizard de onboarding organizacional en 3 pasos con asistencia de IA integrada. Se enfoca en aprovechar el design system existente (shadcn/ui + Tailwind) y la infraestructura de Next.js 14, creando una experiencia conversacional que guía a usuarios a completar configuración en menos de 5 minutos.

## Architecture Decisions

### UI Framework Strategy
- **Leverage Existing Design System**: Reutilizar componentes shadcn/ui actuales
- **Responsive-First Design**: Mobile-first approach con breakpoints consistentes
- **Component Composition**: Wizard basado en composición vs. monolithic forms
- **Progressive Enhancement**: Funcionalidad básica sin IA + enhanced con IA
- **Spanish-First Interface**: Todo el contenido y UX en español nativo

### State Management Approach
- **React Hook Form**: Para validación y state de formularios
- **Zustand**: Para state del wizard (progreso, datos temporales)
- **SWR**: Para cache de sugerencias de IA y datos de organización
- **Local Storage**: Para persistencia de progreso entre sesiones

### Integration Strategy
- **AI Client Integration**: Consume AI Gateway via frontend API calls
- **Stack Auth Integration**: Aprovecha autenticación existente sin cambios
- **API-First Design**: Todas las interacciones via Next.js API routes
- **Graceful Degradation**: Funciona sin IA disponible

## Technical Approach

### Frontend Components

#### Core Wizard Components (`/components/onboarding/`)
```typescript
// Wizard container and navigation
- OnboardingWizard.tsx          // Main wizard container
- WizardStep.tsx                // Generic step wrapper
- WizardNavigation.tsx          // Previous/Next navigation
- ProgressIndicator.tsx         // Visual progress bar

// Step-specific components
- WelcomeStep.tsx               // Hero + value proposition
- CompanyInfoStep.tsx           // Basic company information
- OrganizationStep.tsx          // Department structure
- OKRSetupStep.tsx              // First OKR creation
- CompletionStep.tsx            // Success and redirection
```

#### AI Assistant Components (`/components/ai/`)
```typescript
// Chat and assistance
- FloatingAIChat.tsx            // Persistent chat widget
- AITooltip.tsx                 // Contextual help tooltips
- AISuggestionCard.tsx          // Inline suggestion display
- AILoadingState.tsx            // Loading states for AI responses

// AI-enhanced form elements
- SmartFormField.tsx            // Form field with AI suggestions
- IndustrySelector.tsx          // Visual industry picker
- DepartmentBuilder.tsx         // Drag-and-drop org structure
- OKREditor.tsx                 // Conversational OKR creation
```

#### Layout and UI (`/components/layout/`)
```typescript
// Leveraging existing shadcn/ui components
- Card, Button, Input, Select   // Existing components
- Dialog, Popover, Tooltip      // For AI interactions
- Badge, Progress, Separator    // Visual indicators
- Form, Label, ErrorMessage     // Form components
```

### Backend Services

#### API Endpoints (`/app/api/onboarding/`)
```typescript
// Wizard data management
POST /api/onboarding/start              // Initialize wizard session
PUT  /api/onboarding/progress           // Save step progress
POST /api/onboarding/complete           // Finalize onboarding

// AI integration endpoints
POST /api/onboarding/ai/suggest         // Get AI suggestions
POST /api/onboarding/ai/validate        // Validate input with AI
POST /api/onboarding/ai/complete        // AI auto-completion

// Data endpoints
GET  /api/onboarding/industries         // Available industries
POST /api/onboarding/organization       // Create organization
```

#### State Persistence
```typescript
// Extend existing database schema minimally
CREATE TABLE onboarding_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    current_step INTEGER DEFAULT 1,
    form_data JSONB,
    ai_suggestions JSONB,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Infrastructure

#### Next.js 14 Integration
- **App Router**: Leverages existing routing structure
- **Server Components**: For initial data loading and SEO
- **Client Components**: For interactive wizard steps
- **API Routes**: For wizard state management and AI integration

#### Deployment Strategy
- **Vercel Deployment**: Uses existing pipeline and configuration
- **Feature Flags**: Gradual rollout with existing feature flag system
- **Environment Variables**: Reuses existing AI_GATEWAY_API_KEY setup

## Implementation Strategy

### Development Phases

#### Phase 1: Base Wizard Structure (Week 1)
- Wizard container and navigation components
- Basic form steps without AI integration
- Progress tracking and local storage persistence
- Responsive layout using existing design system

#### Phase 2: AI Integration (Week 2)
- Floating AI chat component implementation
- Smart form fields with AI suggestions
- Conversational OKR editor
- AI-powered tooltips and contextual help

#### Phase 3: Polish & Optimization (Week 3)
- Animations and microinteractions
- Performance optimization and lazy loading
- Accessibility testing and improvements
- Cross-browser testing and bug fixes

### Risk Mitigation
- **AI Dependency**: Wizard works completely without AI functionality
- **Design Consistency**: Strict adherence to existing design system
- **Performance**: Lazy loading and code splitting for optimal UX
- **Accessibility**: Early testing with screen readers and keyboard navigation

### Testing Approach
- **Component Testing**: Jest + React Testing Library for all components
- **Integration Testing**: Playwright for full wizard flow testing
- **Accessibility Testing**: Axe-core integration and manual testing
- **AI Integration Testing**: Mock AI responses for reliable test scenarios

## Task Breakdown Preview

High-level task categories (≤8 total tasks):

- [ ] **Wizard Foundation**: Base wizard container, navigation, and progress tracking
- [ ] **Form Steps Implementation**: Company info, organization structure, OKR setup steps
- [ ] **AI Chat Integration**: Floating chat widget with context-aware responses
- [ ] **Smart Form Components**: AI-enhanced form fields with suggestions and validation
- [ ] **Conversational OKR Editor**: Interactive OKR creation with AI assistance
- [ ] **Visual Polish & Animations**: Microinteractions, transitions, and visual feedback
- [ ] **API Integration & State**: Backend endpoints and state management
- [ ] **Testing & Accessibility**: Comprehensive testing and accessibility compliance

## Dependencies

### External Dependencies
- **Motor AI Complete**: AI Gateway client and endpoints (prerequisite)
- **shadcn/ui**: Existing design system components
- **Next.js 14**: App Router and API routes infrastructure
- **Stack Auth**: Current authentication system (no changes)

### Internal Dependencies
- **Design System**: Established shadcn/ui component library
- **AI Gateway**: Motor AI epic must provide `/api/ai/*` endpoints
- **Organization API**: Basic organization CRUD operations
- **Database Schema**: Minimal extensions for onboarding sessions

### Prerequisite Work
- Motor AI foundation must be functional for AI features
- Existing design system components documented and stable
- Organization data model established in database

## Success Criteria (Technical)

### Performance Benchmarks
- **Initial Load**: <2 seconds for wizard start
- **Step Transitions**: <500ms between wizard steps
- **AI Responses**: <3 seconds for suggestions and validation
- **Mobile Performance**: 60fps animations on mobile devices

### Quality Gates
- **Component Test Coverage**: >90% for all wizard components
- **Accessibility Score**: 100% Lighthouse accessibility audit
- **Cross-browser Support**: Chrome, Firefox, Safari, Edge latest versions
- **Mobile Responsiveness**: Perfect experience down to 320px width

### User Experience Metrics
- **Completion Rate**: >95% users complete all 3 steps
- **Average Time**: <4 minutes total completion time
- **AI Interaction Rate**: >60% users interact with AI features
- **Error Recovery**: <1% users encounter blocking errors

### Acceptance Criteria
- All functionality works without JavaScript (progressive enhancement)
- Complete Spanish localization with no English fallbacks
- Graceful degradation when AI services unavailable
- Seamless integration with existing authentication flow

## Estimated Effort

### Overall Timeline
- **Total Duration**: 3 weeks
- **Team Size**: 1 frontend developer
- **Total Hours**: ~120 hours (40 hours/week)

### Resource Requirements
- **Development**: ~96 hours (80% of timeline)
- **Testing**: ~16 hours (design, accessibility, integration)
- **Documentation**: ~8 hours (component docs and implementation guide)

### Critical Path Items
1. **Wizard Foundation** (blocks all other components)
2. **AI Integration API** (depends on Motor AI epic completion)
3. **Form Steps** (sequential implementation dependency)
4. **Testing & Polish** (final validation before release)

### Dependencies Timeline
- **Week 0**: Motor AI foundation must be ready
- **Week 1**: Wizard structure and basic forms
- **Week 2**: AI integration and smart components
- **Week 3**: Polish, testing, and optimization

### Risk Buffer
- 20% buffer included for AI integration complexity
- Component reusability reduces development risk
- Existing design system minimizes design iteration
- Feature flags enable safe incremental rollout