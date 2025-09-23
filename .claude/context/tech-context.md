---
created: 2025-09-23T20:09:22Z
last_updated: 2025-09-23T20:09:22Z
version: 1.0
author: Claude Code PM System
---

# Technical Context

## Technology Stack

### Frontend Framework
- **Next.js**: 14.2.16 (Latest stable)
- **React**: 18.x with React DOM
- **TypeScript**: Version 5.x (Latest)

### UI/UX Libraries
- **Radix UI**: Comprehensive component library
  - Dialog, Dropdown, Navigation, Popover, Tabs, Toast, etc.
  - Version range: 1.1.x - 2.2.x (Latest stable releases)
- **Tailwind CSS**: 4.1.9 with PostCSS integration
- **Lucide React**: 0.454.0 (Icon library)
- **Next Themes**: 0.4.6 (Theme management)

### Form & Validation
- **React Hook Form**: 7.60.0 (Form state management)
- **Zod**: 3.25.67 (Schema validation)
- **Hookform Resolvers**: 3.10.0 (Zod integration)

### Backend & Database
- **Supabase**: Latest version
  - `@supabase/supabase-js` (Client library)
  - `@supabase/ssr` (Server-side rendering support)
- **Authentication**: Supabase Auth with SSR

### Data Visualization & Processing
- **Recharts**: Latest (Chart library)
- **Papa Parse**: Latest (CSV parsing)
- **XLSX**: Latest (Excel file handling)
- **Date-fns**: Latest (Date manipulation)

### Development Dependencies
- **ESLint**: 8.57.1 with Next.js configuration (15.5.3)
- **PostCSS**: 8.5 with Tailwind CSS integration
- **TypeScript Types**: Node, React, React DOM

### Utility Libraries
- **Class Variance Authority**: 0.7.1 (Styling variants)
- **clsx**: 2.1.1 (Conditional classes)
- **tailwind-merge**: 2.5.5 (Class merging)
- **Lodash**: Latest (Utility functions)

### Deployment & Analytics
- **Vercel Analytics**: Latest
- **Vercel Platform**: Integrated deployment

### AI Integration
- **AI SDK**: Latest OpenAI integration
- **AI**: Latest (Vercel AI SDK)

## Development Environment

### Package Management
- **npm**: Standard Node.js package manager
- **Private**: Repository marked as private

### Build Configuration
- **Autoprefixer**: 10.4.20 (CSS prefixing)
- **Tailwind Animate**: 1.0.7 (Animation utilities)
- **TW Animate CSS**: 1.3.3 (Extended animations)

### Scripts Available
```bash
npm run dev     # Development server
npm run build   # Production build
npm run start   # Production server
npm run lint    # ESLint checking
```

## Version Compatibility

### Node.js Requirements
- Compatible with Node.js 18+ (inferred from React 18 and Next.js 14)

### Browser Support
- Modern browsers (ES6+ support required)
- Supports both light and dark themes
- Responsive design (Tailwind CSS)

## Performance Considerations
- **Next.js 14**: App Router with React Server Components
- **Supabase SSR**: Server-side rendering optimization
- **Vercel Analytics**: Performance monitoring
- **Code Splitting**: Automatic with Next.js

## Security Features
- **Supabase Authentication**: Built-in security
- **TypeScript**: Type safety
- **Zod Validation**: Runtime type checking
- **ESLint**: Code quality enforcement