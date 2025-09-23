---
created: 2025-09-23T20:09:22Z
last_updated: 2025-09-23T20:09:22Z
version: 1.0
author: Claude Code PM System
---

# Project Structure

## Root Directory Layout

```
stratixV2/
├── .claude/                 # Claude Code PM system files
│   ├── context/            # Project context documentation
│   └── [PM system files]   # Command definitions, agents, etc.
├── .env.local              # Local environment variables
├── .gitignore              # Git ignore configuration
├── .vercel/                # Vercel deployment configuration
├── AGENTS.md               # Agent documentation
├── CLAUDE.md               # Claude-specific instructions
├── COMMANDS.md             # Command reference documentation
├── LICENSE                 # Project license
├── README.md               # Project documentation (Claude Code PM)
├── ccpm/                   # Claude Code PM installation files
├── install/                # Installation scripts
├── package.json            # Node.js dependencies and scripts
└── [Source files pending analysis]
```

## Package Configuration

### Dependencies Architecture
- **Framework**: Next.js 14.2.16 (React-based)
- **Styling**: Tailwind CSS with Radix UI components
- **Authentication**: Supabase integration
- **Analytics**: Vercel Analytics
- **Form Handling**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Theme**: Next-themes for dark/light mode

### Development Setup
- **Build Tool**: Next.js
- **Linting**: ESLint with Next.js configuration
- **TypeScript**: Full TypeScript support
- **Styling**: Tailwind CSS with PostCSS

## File Organization Patterns

### Component Architecture (Inferred)
Based on dependencies, project follows Shadcn/UI patterns:
- Radix UI primitives for base components
- Class Variance Authority for styling variants
- Tailwind CSS for utility-first styling
- Lucide React for icons

### Data Handling
- **Database**: Supabase (with SSR support)
- **State Management**: React Hook Form for forms
- **File Processing**: Papa Parse for CSV, XLSX for Excel files
- **Date Handling**: Date-fns library

### Development Workflow
- **Scripts**: Standard Next.js commands (dev, build, start, lint)
- **Package Manager**: npm (based on package.json structure)
- **Deployment**: Vercel platform integration

## Notable Absences
- No visible source code directories yet (src/, app/, pages/, components/)
- No test directories identified
- No configuration files for testing frameworks
- No database schema files visible

## Integration Points
- Supabase for backend services and authentication
- Vercel for deployment and analytics
- Claude Code PM for project management
- GitHub for version control and issue tracking