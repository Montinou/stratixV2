---
created: 2025-09-23T20:09:22Z
last_updated: 2025-09-23T20:09:22Z
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
- **Server State**: Supabase integration suggests server-first approach
- **Theme State**: Next-themes for global theme management

### Data Flow Architecture
Based on dependencies and recent commits:

```
User Input → React Hook Form → Zod Validation → Supabase → UI Update
     ↓
Theme Provider → Component Tree → Radix UI Primitives → Tailwind CSS
```

### Authentication Pattern
Recent commits mention auth hook issues, suggesting:
- **Hook-based Auth**: Custom authentication hooks
- **SSR Auth**: Supabase SSR for server-side authentication
- **Route Protection**: Authentication-based navigation

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
- **Next.js Optimization**: Built-in performance features
- **Component Composition**: Efficient re-render patterns
- **Server-Side Rendering**: Supabase SSR integration

### Error Handling
Based on recent fixes, suggests:
- **Defensive Programming**: Preventing infinite loops
- **State Cleanup**: Proper effect cleanup patterns
- **Error Boundaries**: Component-level error handling

## Integration Patterns

### External Services
- **Supabase Integration**: Database + Auth + Real-time
- **Vercel Deployment**: Seamless CI/CD pipeline
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
- **Supabase Backend**: Scalable database solution
- **Real-time Capabilities**: Built-in real-time features
- **File Processing**: Scalable data import patterns