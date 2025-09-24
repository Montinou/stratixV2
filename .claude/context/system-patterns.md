---
created: 2025-09-24T05:32:18Z
last_updated: 2025-09-24T05:32:18Z
version: 1.0
author: Claude Code PM System
---

# System Patterns & Architecture

## Design Patterns (Inferred)

### Component Architecture
- **Atomic Design**: Radix UI primitives suggest component composition pattern
- **Headless UI**: Unstyled components with custom styling via Tailwind CSS
- **Compound Components**: Radix UI's approach to complex component relationships

### State Management Patterns
- **Form State**: React Hook Form with controlled components
- **Server State**: NeonDB with custom database service layer
- **Authentication State**: Stack Auth (NeonAuth) with database-backed sessions
- **Theme State**: Next-themes for global theme management

### Data Flow Architecture
Updated architecture with NeonDB and Stack Auth:

```
User Input → React Hook Form → Zod Validation → NeonDB Service Layer → PostgreSQL → UI Update
     ↓
Stack Auth → AuthProvider → Protected Routes → Component Tree → Radix UI Primitives → Tailwind CSS
     ↓
Migration Scripts → Health Checks → Database Operations → CI/CD Pipeline
```

### Authentication Pattern
Migrated to Stack Auth (NeonAuth) system:
- **Stack Auth Integration**: Modern authentication with database-backed sessions
- **AuthProvider Pattern**: Centralized authentication state management
- **Route Protection**: Middleware-based authentication validation
- **Database Sessions**: User profiles and sessions stored in NeonDB

## Architectural Decisions

### Styling Strategy
- **Utility-First**: Tailwind CSS approach
- **Component Variants**: Class Variance Authority for systematic styling
- **Design System**: Shadcn/UI pattern implementation
- **Responsive Design**: Mobile-first approach (Tailwind default)

### Form Handling Philosophy
- **Schema-First**: Zod schemas define data structure
- **Controlled Components**: React Hook Form for state management
- **Type Safety**: TypeScript + Zod for end-to-end type safety

### Data Processing Approach
- **File Handling**: Support for CSV (Papa Parse) and Excel (XLSX)
- **Date Management**: Date-fns for consistent date operations
- **Visualization**: Recharts for data presentation

## Recent Problem Patterns (From Commits)

### Infinite Loop Issues
Recent commits indicate patterns around:
- **Auth State Loops**: Authentication state causing render loops
- **Effect Dependencies**: useEffect dependency issues
- **State Updates**: Cascading state updates causing loops

### Pages Affected
- **Objectives Page**: Loop patterns identified and fixed
- **Activities Page**: Loop patterns identified and fixed
- **Insights Page**: Auth-related loop issues resolved

## Code Quality Patterns

### Type Safety
- **Full TypeScript**: Complete type coverage
- **Runtime Validation**: Zod for API boundaries
- **Component Props**: Typed component interfaces

### Performance Patterns
- **Next.js Optimization**: Built-in performance features with App Router
- **Component Composition**: Efficient re-render patterns
- **Database Connection Pooling**: Optimized PostgreSQL connections
- **Migration Performance**: Automated health checks and validation

### Error Handling
Based on recent fixes, suggests:
- **Defensive Programming**: Preventing infinite loops
- **State Cleanup**: Proper effect cleanup patterns
- **Error Boundaries**: Component-level error handling

## Integration Patterns

### External Services
- **NeonDB Integration**: PostgreSQL 17.5 with SSL connections
- **Stack Auth (NeonAuth)**: Modern authentication system
- **Vercel Deployment**: CI/CD pipeline with automated pre-build migration
- **Analytics Integration**: Performance monitoring

### Development Workflow
- **Git Flow**: Feature branches with PR merges
- **Issue Tracking**: GitHub Issues integration
- **Claude Code PM**: AI-assisted project management

## Scalability Considerations

### Component Reusability
- **Radix Primitives**: Composable UI components
- **Tailwind Utilities**: Consistent styling patterns
- **TypeScript Interfaces**: Reusable type definitions

### Data Architecture
- **NeonDB Backend**: Serverless PostgreSQL 17.5 solution
- **Custom Service Layer**: Database abstraction with TypeScript
- **Migration System**: Automated schema management and validation
- **File Processing**: Scalable data import patterns
- **Connection Pooling**: Optimized database performance

## New Infrastructure Patterns (2025-09-24)

### Database Service Layer Pattern
- **Custom PostgreSQL Client**: Direct `pg` package integration
- **Server Actions**: Next.js server actions for database operations
- **Type Safety**: End-to-end TypeScript with database schemas
- **Connection Management**: SSL connections with pooling

### Migration Management Pattern
- **Pre-build Migration**: Automated migration before deployment
- **Health Validation**: Comprehensive database health checks
- **Rollback Capabilities**: Multi-level rollback system (auto, manual, emergency)
- **Environment Validation**: Production-ready environment checking

### CI/CD Integration Pattern
- **Automated Deployment**: Vercel integration with migration hooks
- **Health Monitoring**: Continuous health validation during deployment
- **Error Recovery**: Automated rollback on migration failures
- **Script Automation**: @scripts/ directory with deployment toolkit

---

**Last Updated**: 2025-09-24T05:32:18Z  
**Version**: 1.0 - Complete system patterns documentation post-NeonDB migration  
**Key Insight**: Modern architecture patterns with NeonDB, automated deployment, and comprehensive migration management