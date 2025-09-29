---
created: 2025-09-29T04:50:25Z
last_updated: 2025-09-29T04:50:25Z
version: 1.0
author: Claude Code PM System
---

# Tech Context

## Core Technology Stack

### Frontend Framework
- **Next.js 15.3.3**: React framework with App Router
- **React 18.3.1**: Latest stable React with concurrent features
- **TypeScript 5**: Full type safety across the application

### Styling & UI
- **Tailwind CSS 4**: Utility-first CSS framework (latest version)
- **shadcn/ui**: High-quality component library built on Radix UI
- **Radix UI Primitives**: Comprehensive set of low-level UI components
- **Lucide React**: Modern icon library
- **next-themes**: Theme switching capabilities

### Authentication & Authorization
- **@stackframe/stack 2.8.12**: Modern authentication system (Stack Auth)
- **Neon Auth Integration**: Database-backed authentication profiles

### Database & ORM
- **Neon Serverless PostgreSQL**: Serverless PostgreSQL database
- **@neondatabase/serverless**: Neon database client
- **Drizzle ORM 0.44.2**: TypeScript-first ORM
- **drizzle-kit 0.31.1**: Database migration toolkit

### State Management & Data
- **@tanstack/react-table 8.21.3**: Powerful table management
- **React Hook Form 7.57.0**: Form state management
- **@hookform/resolvers 5.0.1**: Form validation resolvers
- **Zod 3.25.57**: Schema validation library

### AI Integration
- **@ai-sdk/anthropic 1.0.11**: Anthropic AI SDK
- **@ai-sdk/openai 1.0.22**: OpenAI AI SDK
- **ai 4.0.58**: Vercel AI SDK

### Caching & Performance
- **ioredis 5.8.0**: Redis client for caching
- **date-fns 3.6.0**: Date utility library

### Development Tools
- **tsx 4.19.4**: TypeScript execution environment
- **Prettier 3.5.3**: Code formatting
- **prettier-plugin-tailwindcss 0.6.12**: Tailwind CSS class sorting

## Development Environment

### Node.js & Package Manager
- **Node.js**: Latest LTS version
- **npm**: Default package manager
- **Turbopack**: Next.js bundler for development

### Build & Deployment
- **Vercel**: Hosting platform (configured)
- **Environment Variables**: Managed through Vercel and local `.env.development.local`

### Database Configuration
```typescript
// drizzle.config.ts
export default {
  schema: './db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
}
```

## Key Dependencies Analysis

### Core Framework Dependencies
```json
{
  "next": "15.3.3",           // Latest Next.js with App Router
  "react": "18.3.1",          // Stable React version
  "typescript": "^5"          // Latest TypeScript
}
```

### UI & Styling Ecosystem
```json
{
  "@radix-ui/*": "Various",   // Comprehensive UI primitive set
  "tailwindcss": "^4",        // Latest Tailwind CSS
  "class-variance-authority": "^0.7.1", // Component variant management
  "tailwind-merge": "^3.3.0"  // Tailwind class merging utility
}
```

### Database & Backend
```json
{
  "drizzle-orm": "^0.44.2",             // Modern TypeScript ORM
  "@neondatabase/serverless": "^1.0.1",  // Neon PostgreSQL client
  "pg": "^8.16.0"                       // PostgreSQL driver
}
```

### Authentication Stack
```json
{
  "@stackframe/stack": "^2.8.12"  // Complete auth solution
}
```

## Development Scripts

```json
{
  "dev": "next dev --turbopack",  // Development with Turbopack
  "build": "next build",          // Production build
  "start": "next start",          // Production server
  "lint": "next lint",            // ESLint checking
  "format": "prettier --write ."  // Code formatting
}
```

## Environment Configuration

### Required Environment Variables
- `DATABASE_URL`: Neon PostgreSQL connection string
- `STACK_PROJECT_ID`: Stack Auth project identifier
- `NEXT_PUBLIC_STACK_KEY`: Public Stack Auth key
- `STACK_SECRET_KEY`: Private Stack Auth key

### Development Environment
- Local environment file: `.env.development.local`
- Development server port: 3000
- Turbopack enabled for faster development builds

## Architecture Decisions

### Why These Technologies?

**Next.js 15 + App Router**: Latest routing paradigm with server components
**Stack Auth**: Modern authentication with built-in user management
**Neon**: Serverless PostgreSQL with excellent scaling characteristics
**Drizzle ORM**: Type-safe database queries with excellent TypeScript integration
**shadcn/ui**: Consistent, customizable component library
**Tailwind CSS 4**: Latest version with improved performance and developer experience

### Version Strategy
- **Major dependencies**: Pinned to specific versions for stability
- **UI components**: Using latest compatible versions
- **Development tools**: Latest versions for improved developer experience

This technology stack provides a modern, scalable foundation for internal tools with excellent developer experience and enterprise-grade security.