---
created: 2025-10-01T09:07:54Z
last_updated: 2025-10-01T09:07:54Z
version: 1.0
author: Claude Code PM System
---

# Technology Context

## Core Technologies

### Runtime & Framework
- **Node.js**: v24.5.0 (latest LTS)
- **NPM**: v11.5.1
- **Next.js**: 15.3.3 with App Router and Turbopack
- **React**: 18.3.1 with Server Components
- **TypeScript**: v5 with strict mode

### Language Configuration
- **Target**: ES2017
- **Module System**: ESNext with bundler resolution
- **Strict Mode**: Enabled
- **JSX**: preserve (handled by Next.js)

## Frontend Stack

### UI Framework
- **Styling**: Tailwind CSS 4.1.9 with PostCSS
- **Component Library**: Shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React v0.513.0
- **Fonts**: Inter (sans-serif), JetBrains Mono (monospace)

### UI Components (Radix UI)
- 30+ Radix UI components installed:
  - Accordion, Alert Dialog, Avatar, Checkbox
  - Dialog, Dropdown Menu, Hover Card, Label
  - Navigation Menu, Popover, Progress, Radio Group
  - Scroll Area, Select, Separator, Slider
  - Switch, Tabs, Toggle, Tooltip, etc.

### Form & Validation
- **Forms**: React Hook Form v7.57.0
- **Validation**: Zod v3.25.57
- **Resolvers**: @hookform/resolvers v5.0.1

### Data Visualization
- **Charts**: Recharts v2.15.3
- **Tables**: TanStack React Table v8.21.3

### Additional UI Libraries
- **Carousel**: Embla Carousel React v8.6.0
- **File Upload**: React Dropzone v14.3.8
- **Resizable Panels**: React Resizable Panels v3.0.2
- **Toast Notifications**: Sonner v2.0.5
- **Drawer**: Vaul v1.1.2
- **Command Palette**: CMDK v1.1.1
- **OTP Input**: Input OTP v1.4.2
- **Theme**: Next Themes v0.4.6

## Backend Stack

### Database
- **Provider**: NeonDB (PostgreSQL 17.5)
- **Client**: @neondatabase/serverless v1.0.1
- **ORM**: Drizzle ORM v0.44.5
- **Schema Management**: Drizzle Kit v0.31.1
- **Direct Client**: pg v8.16.3

### Database Features
- Connection pooling enabled
- SSL/TLS required
- Row Level Security (RLS)
- Schema filtering: `public`, `neon_auth`

### Authentication
- **Provider**: Stack Auth (@stackframe/stack v2.8.41)
- **Integration**: NeonAuth (native Neon integration)
- **Session Management**: Server-side with cookies
- **Middleware**: Custom auth middleware

### Caching
- **Redis Client**: ioredis v5.8.0
- **Use Cases**: Session caching, rate limiting

## AI Integration

### AI SDKs
- **Vercel AI SDK**: ai v4.0.58
- **Anthropic**: @ai-sdk/anthropic v1.0.11
- **OpenAI**: @ai-sdk/openai v1.0.22
- **Gateway**: Vercel AI Gateway (configured)

## Development Dependencies

### Type Definitions
- @types/node v20
- @types/react v19
- @types/react-dom v19
- @types/papaparse v5.3.16
- @types/pg v8.15.5

### Build Tools
- **TypeScript Compiler**: v5
- **PostCSS**: @tailwindcss/postcss v4
- **TSX**: tsx v4.19.4 (TypeScript execution)

### Data Processing
- **CSV Parser**: papaparse v5.5.3
- **Excel**: xlsx v0.18.5

### Testing
- **Browser Automation**: Playwright v1.55.1

### Code Quality
- **Linting**: ESLint (Next.js config)
- **Formatting**: Prettier v3.5.3
- **Prettier Plugins**: prettier-plugin-tailwindcss v0.6.12

### Utilities
- **Class Management**: clsx v2.1.1, tailwind-merge v3.3.0
- **Variants**: class-variance-authority v0.7.1
- **Date Utilities**: date-fns v3.6.0
- **Environment**: dotenv v16.5.0
- **Animation**: tw-animate-css v1.3.4
- **Faker**: @faker-js/faker v10.0.0 (testing data)

## Environment Configuration

### Required Variables
```env
# Database
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...
NEON_PROJECT_ID=quiet-salad-84768604

# Authentication
NEXT_PUBLIC_STACK_PROJECT_ID=...
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=...
STACK_SECRET_SERVER_KEY=...

# AI Gateway
AI_GATEWAY_API_KEY=...

# Redis
REDIS_URL=redis://...

# Email (Brevo)
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=...

# Vercel
VERCEL_TOKEN=xlZfF4ANIRFDqJDBLSlAWRMp
```

## Development Tools

### Package Manager
- **Primary**: pnpm (recommended)
- **Alternative**: npm
- **Scripts**: 10+ custom scripts defined

### Build Configuration
- **Next.js**: Turbopack for fast builds
- **TypeScript**: Incremental compilation
- **CSS**: Tailwind with JIT mode

### Database Tools
- **Migrations**: Drizzle Kit
- **Studio**: Drizzle Studio (visual DB manager)
- **CLI**: psql for direct queries

### Deployment
- **Platform**: Vercel
- **CLI**: Vercel CLI with token auth
- **Environment**: Development, Preview, Production

## Version Compatibility

### Node.js Requirements
- Minimum: Node.js 20
- Current: Node.js 24.5.0
- Package Manager: npm 11.5.1 or pnpm latest

### Browser Support
- Modern browsers with ES2017+ support
- Next.js handles polyfills automatically

## External Services

### Production Services
- **Database**: NeonDB (PostgreSQL as a Service)
- **Auth**: Stack Auth (Authentication as a Service)
- **Hosting**: Vercel (Serverless deployment)
- **Redis**: Redis Cloud (Caching)
- **Email**: Brevo (formerly Sendinblue)

### Development Services
- **Git**: GitHub (version control)
- **CI/CD**: GitHub Actions + Vercel
