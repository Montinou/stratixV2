---
created: 2025-09-24T00:43:39Z
last_updated: 2025-09-24T00:43:39Z
version: 1.0
author: Claude Code PM System
---

# Technical Context

## Current Technology Stack

### Frontend Framework
- **Next.js**: 14.2.16 (App Router architecture)
- **React**: 18.x with React DOM
- **TypeScript**: Version 5.x with strict configuration

### Database & Authentication (Migrated)
- **PostgreSQL**: Primary database via NeonDB
- **pg**: 8.16.3 (PostgreSQL client library)
- **@stackframe/stack**: 2.8.39 (Authentication provider)
- **NeonDB**: Cloud PostgreSQL hosting
- **Environment**: Production and development database separation

### Legacy Database (Being Phased Out)
- ~~**Supabase**: Previously used for database and auth~~
- Files being removed from `/lib/supabase/`

### UI/UX Libraries
- **Radix UI**: Comprehensive accessible component library
  - Dialog, Dropdown, Navigation, Popover, Tabs, Toast, etc.
  - Version range: 1.1.x - 2.2.x (Latest stable releases)
- **Tailwind CSS**: 4.1.9 with PostCSS integration
- **Shadcn/ui**: Component system built on Radix UI
- **Lucide React**: 0.454.0 (Icon library)
- **Next Themes**: 0.4.6 (Theme management)
- **Geist**: 1.3.1 (Font family)

### Form & Validation
- **React Hook Form**: 7.60.0 (Form state management)
- **Zod**: 3.25.76 (Schema validation and type safety)
- **@hookform/resolvers**: 3.10.0 (Zod integration)

### Data Visualization & Processing
- **Recharts**: Latest (Chart library for analytics)
- **Papa Parse**: Latest (CSV parsing for import features)
- **XLSX**: Latest (Excel file handling)
- **date-fns**: Latest (Date manipulation utilities)

### Development Dependencies
- **ESLint**: 8.57.1 with Next.js configuration (15.5.3)
- **PostCSS**: 8.5 with Tailwind CSS integration
- **TypeScript Types**: 
  - `@types/node`: 22.x
  - `@types/react`: 18.x
  - `@types/react-dom`: 18.x
  - `@types/pg`: 8.15.5 (PostgreSQL types)
  - `@types/lodash`: 4.17.20
- **tsx**: 4.20.5 (TypeScript execution for scripts)
- **dotenv**: 17.2.2 (Environment variable loading)

### Utility Libraries
- **Class Variance Authority**: 0.7.1 (Styling variants)
- **clsx**: 2.1.1 (Conditional classes)
- **tailwind-merge**: 2.5.5 (Class merging)
- **Lodash**: Latest (Utility functions)

### Deployment & Analytics
- **Vercel Analytics**: Latest (Performance monitoring)
- **Vercel Platform**: Integrated deployment and hosting

### AI Integration
- **@ai-sdk/openai**: Latest (OpenAI integration)
- **ai**: Latest (Vercel AI SDK)

## Development Environment

### Package Management
- **npm**: Standard Node.js package manager
- **Private**: Repository marked as private

### Build Configuration
- **@tailwindcss/postcss**: 4.1.9 (Tailwind CSS processing)
- **Autoprefixer**: 10.4.20 (CSS prefixing)
- **tailwindcss-animate**: 1.0.7 (Animation utilities)
- **tw-animate-css**: 1.3.3 (Extended animations)

### Scripts Available
```bash
npm run dev            # Development server
npm run build          # Production build
npm run start          # Production server
npm run lint           # ESLint checking
npm run db:init        # Initialize database schema
npm run db:migrate     # Run database migrations
npm run remove-supabase # Clean up legacy Supabase imports
```

## Migration Status

### Completed Migrations
- ✅ **Database**: Supabase → PostgreSQL/NeonDB
- ✅ **Authentication**: Supabase Auth → Stack Auth
- ✅ **Database Client**: Custom PostgreSQL client implementation
- ✅ **Server Actions**: Next.js server actions for database operations
- ✅ **API Routes**: Converted to use PostgreSQL directly

### In Progress
- 🔄 **UI Components**: Updating forms and pages to use new services
- 🔄 **Legacy Cleanup**: Removing Supabase references and backup files

### Architecture Decisions

#### Database Layer
- **Direct PostgreSQL Connection**: Using `pg` library for better control
- **Service Layer Pattern**: Abstraction layer in `/lib/database/services.ts`
- **Connection Pooling**: Implemented for production performance
- **Environment Separation**: Separate databases for dev/prod

#### Authentication Strategy
- **Stack Auth**: Modern authentication provider with better DX
- **JWT-based**: Stateless authentication tokens
- **Role-based Access**: User roles and permissions system
- **Session Management**: Secure session handling with refresh tokens

#### Type Safety
- **End-to-End Types**: From database schema to UI components
- **Zod Schemas**: Runtime validation matching TypeScript types
- **Database Types**: Generated TypeScript types from PostgreSQL schema

## Performance Considerations

### Next.js Optimizations
- **App Router**: React Server Components for better performance
- **Static Generation**: Where applicable for better loading times
- **Image Optimization**: Built-in Next.js image optimization
- **Code Splitting**: Automatic with Next.js bundle splitting

### Database Performance
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Optimized PostgreSQL queries
- **Indexing Strategy**: Database indexes for frequently queried fields
- **Caching**: Strategic caching of expensive operations

### Bundle Optimization
- **Tree Shaking**: Automatic with Next.js build process
- **Component Lazy Loading**: Dynamic imports where beneficial
- **Asset Optimization**: Optimized images and fonts

## Security Features

### Authentication Security
- **Stack Auth**: Enterprise-grade authentication
- **JWT Tokens**: Secure token-based authentication
- **Role-based Access Control**: Granular permissions system
- **Secure Sessions**: HTTP-only cookies with secure flags

### Database Security
- **Parameterized Queries**: SQL injection protection
- **Connection Encryption**: TLS encryption for database connections
- **Environment Variables**: Secrets management via environment variables
- **Access Controls**: Database-level user permissions

### Application Security
- **TypeScript**: Compile-time type safety
- **Zod Validation**: Runtime input validation
- **ESLint Security Rules**: Security-focused linting rules
- **HTTPS**: Enforced secure connections in production

## Development Workflow

### Local Development
- **Environment Setup**: `.env.local` for local configuration
- **Database Scripts**: Automated database initialization
- **Hot Reloading**: Fast development feedback loop
- **Type Checking**: Real-time TypeScript validation

### Testing Strategy
- **Type Safety**: Comprehensive TypeScript coverage
- **Schema Validation**: Zod validation for all inputs
- **Integration Testing**: End-to-end workflow validation

### Deployment Pipeline
- **Vercel Integration**: Automatic deployments from Git
- **Environment Variables**: Secure configuration management
- **Build Optimization**: Production-ready builds
- **Health Checks**: Application monitoring and alerts