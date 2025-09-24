---
created: 2025-09-24T00:43:39Z
last_updated: 2025-09-24T00:43:39Z
version: 1.0
author: Claude Code PM System
---

# System Patterns & Architecture

## Current Design Patterns

### Component Architecture
- **Atomic Design**: Shadcn/ui components built on Radix UI primitives
- **Headless UI**: Unstyled Radix components with custom Tailwind styling
- **Compound Components**: Complex component relationships (Forms, Dialogs, etc.)
- **Server Components**: Next.js App Router with React Server Components

### State Management Patterns
- **Form State**: React Hook Form with uncontrolled components for performance
- **Server State**: PostgreSQL with server actions for data mutations
- **Authentication State**: Stack Auth with global context provider
- **Theme State**: Next-themes for system/light/dark mode management

### Data Flow Architecture
Current architecture post-migration:

```
User Input → React Hook Form → Zod Validation → Server Actions → PostgreSQL
     ↓                                              ↓
Optimistic Updates → Component State → UI Update ← Database Response
     ↓
Theme Provider → AuthProvider → Component Tree → Shadcn Components
```

### Authentication Pattern (Updated)
- **Stack Auth Integration**: Modern authentication provider
- **JWT-based Sessions**: Stateless authentication with secure tokens
- **Server-side Validation**: Middleware for route protection
- **Context-based State**: Global auth state via React Context

## Architectural Decisions

### Database Migration Strategy
- **Service Layer Pattern**: Abstraction layer in `/lib/database/services.ts`
- **Direct SQL**: Custom queries using `pg` library for better performance
- **Connection Pooling**: Efficient database connection management
- **Type Safety**: Generated TypeScript types from database schema

### Styling Strategy
- **Utility-First**: Tailwind CSS with CSS variables for theming
- **Component Variants**: CVA (Class Variance Authority) for systematic styling
- **Design System**: Consistent Shadcn/ui pattern implementation
- **Responsive Design**: Mobile-first approach with breakpoint consistency

### Form Handling Philosophy
- **Schema-First**: Zod schemas as single source of truth
- **Uncontrolled Forms**: React Hook Form for optimal performance
- **Type Safety**: End-to-end type safety from schema to UI
- **Server Actions**: Direct server mutations without API routes

### Data Processing Approach
- **File Handling**: Robust CSV (Papa Parse) and Excel (XLSX) processing
- **Date Management**: Date-fns with consistent timezone handling
- **Visualization**: Recharts with responsive design patterns
- **Import Pipeline**: Structured data validation and error handling

## Current Problem Patterns (Resolved)

### Migration Challenges
Successfully resolved:
- **Database Migration**: Supabase → PostgreSQL transition complete
- **Authentication Migration**: Supabase Auth → Stack Auth complete
- **State Management**: Updated to use new auth and database patterns
- **Component Updates**: Forms and pages updated for new services

### Legacy Issues (Fixed)
- **Infinite Loop Prevention**: Proper useEffect dependencies and cleanup
- **Auth State Loops**: Stable authentication state management
- **Effect Dependencies**: Correct dependency arrays and memoization
- **State Updates**: Prevented cascading state update cycles

## Code Quality Patterns

### Type Safety (Enhanced)
- **Full TypeScript**: Strict mode with comprehensive type coverage
- **Database Types**: Generated types from PostgreSQL schema
- **Runtime Validation**: Zod schemas for API boundaries and forms
- **Component Props**: Strict typing with proper inference

### Performance Patterns
- **Server Components**: Leverage React Server Components for performance
- **Database Optimization**: Connection pooling and query optimization
- **Component Memoization**: Strategic use of React.memo and useMemo
- **Bundle Optimization**: Tree shaking and code splitting

### Error Handling (Improved)
- **Defensive Programming**: Null checks and fallback values
- **Database Error Handling**: Proper error boundaries for DB operations
- **Form Validation**: Comprehensive client and server-side validation
- **Migration Safety**: Backup files for all critical changes

## Integration Patterns (Updated)

### Current Services
- **NeonDB Integration**: PostgreSQL hosting with connection pooling
- **Stack Auth**: Modern authentication with JWT tokens
- **Vercel Deployment**: Optimized for Next.js App Router
- **Analytics Integration**: Performance monitoring and user insights

### Development Workflow
- **Git Worktree**: Branch isolation for parallel development
- **Issue Tracking**: GitHub Issues with PM system integration
- **Claude Code PM**: AI-assisted project management and coordination
- **Migration Scripts**: Automated database schema management

## Scalability Considerations

### Component Architecture
- **Radix Primitives**: Accessible, composable UI foundation
- **Design Tokens**: CSS variables for consistent theming
- **Component Library**: Reusable Shadcn/ui components
- **TypeScript Interfaces**: Shared type definitions across layers

### Data Architecture (Enhanced)
- **PostgreSQL Backend**: Scalable relational database with advanced features
- **Connection Pooling**: Efficient database resource utilization
- **Query Optimization**: Indexed queries and efficient data access patterns
- **Service Layer**: Clean separation of business logic from UI

### Development Patterns
- **Monorepo Structure**: Organized codebase with clear boundaries
- **Parallel Development**: Multiple agents working on different features
- **Context Preservation**: Comprehensive documentation and state tracking
- **Migration Strategy**: Safe, incremental updates with rollback capability

## Memory System Patterns

### Context Management
- **Project Context**: Comprehensive documentation in `.claude/context/`
- **State Preservation**: Persistent context across development sessions
- **Agent Coordination**: Shared context for parallel development workflows
- **Progress Tracking**: Real-time updates and status management

### Database Schema Patterns
- **Memory Tables**: Structured storage for context and state information
- **Relationship Mapping**: Foreign keys and constraints for data integrity
- **Audit Trail**: Comprehensive logging of all changes and operations
- **Performance Optimization**: Indexes and query optimization for fast access