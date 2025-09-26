# Deployment Fix Plan - StratixV2 Production Readiness

## ⚠️ CRITICAL ERROR ANALYSIS FROM VERCEL LOGS

**Single Root Cause**: Stack Auth is attempting to access server-side internals during static generation, causing ALL pages to fail prerendering.

### Error Pattern from Vercel Build:
```
TypeError: Cannot read properties of undefined (reading 'Symbol(StackAppInternals)')
    at u (/vercel/path0/.next/server/chunks/3844.js:390:70579)
```

### Pages Failing (ALL PAGES):
- /_not-found
- /activities  
- /analytics
- /auth/verify-email
- /companies
- /import
- /initiatives
- /insights
- /objectives
- / (home page)
- /profile
- /team

## THE SOLUTION: Disable Static Generation for All Pages

Since Stack Auth requires runtime context (cookies, session), we need to force all pages to be dynamic. This is the quickest path to production.

## Step-by-Step Fix Plan (File by File)

### Phase 1: Fix All Page Components (CRITICAL - 15 minutes)

#### File 1: `/app/page.tsx`
**Add at the top of file:**
```typescript
export const dynamic = 'force-dynamic'
```

#### File 2: `/app/activities/page.tsx`
**Add at the top of file:**
```typescript
export const dynamic = 'force-dynamic'
```

#### File 3: `/app/analytics/page.tsx`
**Add at the top of file:**
```typescript
export const dynamic = 'force-dynamic'
```

#### File 4: `/app/auth/verify-email/page.tsx`
**Add at the top of file:**
```typescript
export const dynamic = 'force-dynamic'
```

#### File 5: `/app/companies/page.tsx`
**Add at the top of file:**
```typescript
export const dynamic = 'force-dynamic'
```

#### File 6: `/app/import/page.tsx`
**Add at the top of file:**
```typescript
export const dynamic = 'force-dynamic'
```

#### File 7: `/app/initiatives/page.tsx`
**Add at the top of file:**
```typescript
export const dynamic = 'force-dynamic'
```

#### File 8: `/app/insights/page.tsx`
**Add at the top of file:**
```typescript
export const dynamic = 'force-dynamic'
```

#### File 9: `/app/objectives/page.tsx`
**Add at the top of file:**
```typescript
export const dynamic = 'force-dynamic'
```

#### File 10: `/app/profile/page.tsx`
**Add at the top of file:**
```typescript
export const dynamic = 'force-dynamic'
```

#### File 11: `/app/team/page.tsx`
**Add at the top of file:**
```typescript
export const dynamic = 'force-dynamic'
```

#### File 12: `/app/dashboard/page.tsx`
**Add at the top of file:**
```typescript
export const dynamic = 'force-dynamic'
```

### Phase 2: Fix Layout Files (5 minutes)

#### File 13: `/app/layout.tsx`
**Add after imports:**
```typescript
export const dynamic = 'force-dynamic'
```

#### File 14: `/app/auth/layout.tsx` (if exists)
**Add at the top:**
```typescript
export const dynamic = 'force-dynamic'
```

### Phase 3: Fix Additional Pages (5 minutes)

#### Check and fix these files if they exist:
- `/app/auth/signin/page.tsx`
- `/app/auth/signup/page.tsx`
- `/app/auth/reset-password/page.tsx`
- `/app/auth/forgot-password/page.tsx`
- Any other page.tsx files in the app directory

**For each, add:**
```typescript
export const dynamic = 'force-dynamic'
```

### Phase 4: Verify API Routes (2 minutes)

#### Files to check (should already have `export const dynamic = 'force-dynamic'`):
- `/app/api/analytics/overview/route.ts` ✅ (already has it)
- `/app/api/analytics/department-performance/route.ts` ✅ (already has it)
- `/app/api/analytics/progress-trend/route.ts` ✅ (already has it)
- `/app/api/dashboard/stats/route.ts` ✅ (already has it)

#### Files that might need it:
- `/app/api/reports/completion-rate/route.ts`
- `/app/api/profiles/route.ts`
- `/app/api/objectives/route.ts`
- `/app/api/initiatives/route.ts`
- `/app/api/activities/route.ts`
- All other API routes

### Phase 5: Environment Variables Verification (3 minutes)

#### Verify in Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Ensure these are set for Preview AND Production:
   - `NEXT_PUBLIC_STACK_PROJECT_ID`
   - `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`
   - `STACK_SECRET_SERVER_KEY`
   - `DATABASE_URL`
   - `DIRECT_DATABASE_URL`

### Phase 6: Testing (5 minutes)

#### Local Test:
```bash
# Clean build
rm -rf .next
npm run build
```

#### Deploy to Preview:
```bash
git add .
git commit -m "Fix: Add dynamic rendering to all pages for Stack Auth compatibility"
git push
```

## Alternative Solution (If Above Doesn't Work)

### Create a Client Wrapper Component

#### File: `/components/providers/client-wrapper.tsx`
```typescript
'use client'

import { ReactNode } from 'react'

export default function ClientWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>
}
```

#### Then wrap Stack-dependent content in pages:
```typescript
import ClientWrapper from '@/components/providers/client-wrapper'

export default function Page() {
  return (
    <ClientWrapper>
      {/* Your page content */}
    </ClientWrapper>
  )
}
```

## Quick Command to Find All Pages

```bash
find app -name "page.tsx" -type f
```

## Implementation Checklist

### Must Fix (All Pages):
- [ ] `/app/page.tsx`
- [ ] `/app/activities/page.tsx`
- [ ] `/app/analytics/page.tsx`
- [ ] `/app/auth/verify-email/page.tsx`
- [ ] `/app/companies/page.tsx`
- [ ] `/app/import/page.tsx`
- [ ] `/app/initiatives/page.tsx`
- [ ] `/app/insights/page.tsx`
- [ ] `/app/objectives/page.tsx`
- [ ] `/app/profile/page.tsx`
- [ ] `/app/team/page.tsx`
- [ ] `/app/dashboard/page.tsx`
- [ ] `/app/layout.tsx`

### Should Check:
- [ ] All API routes in `/app/api/**/*.ts`
- [ ] Any auth pages in `/app/auth/*/page.tsx`
- [ ] Any admin pages if they exist

## Expected Result

After adding `export const dynamic = 'force-dynamic'` to all pages:
1. Build will complete successfully
2. No more `Symbol(StackAppInternals)` errors
3. All pages will render at request time (not static)
4. Stack Auth will have access to cookies/session
5. Application will deploy to Vercel successfully

## Performance Note

While forcing dynamic rendering on all pages isn't ideal for performance, it's necessary when using Stack Auth which requires runtime context. This can be optimized later by:
- Creating static landing pages that don't require auth
- Using client-side data fetching where possible
- Implementing proper caching strategies

## Total Implementation Time: ~30 minutes

### Breakdown:
- Phase 1 (Pages): 15 minutes
- Phase 2 (Layouts): 5 minutes
- Phase 3 (Additional): 5 minutes
- Phase 4 (API Routes): 2 minutes
- Phase 5 (Environment): 3 minutes
- Phase 6 (Testing): 5 minutes

## Success Metrics

✅ Build completes without errors
✅ No `Symbol(StackAppInternals)` errors
✅ All pages load in browser
✅ Authentication works
✅ Vercel deployment succeeds

## Post-Deployment

After successful deployment:
1. Test all pages in production
2. Verify authentication flow
3. Check database connections
4. Monitor for any runtime errors
5. Consider performance optimizations