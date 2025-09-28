---
created: 2025-09-28T04:20:00Z
updated: 2025-09-28T04:20:00Z
priority: critical
category: quality-control
---

# Production Readiness Checklist - MANDATORY

## ⚠️ NEVER CLAIM "PRODUCTION READY" WITHOUT VERIFICATION

### Compilation & Build Verification (REQUIRED)

Before claiming any implementation is "production ready":

1. **Build Verification** (MANDATORY):
```bash
# In epic worktree:
npm run build

# Expected: ✅ Build successful
# If fails: Fix ALL compilation errors before claiming completion
```

2. **Type Checking** (MANDATORY):
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Expected: No type errors
# If fails: Fix ALL type errors before claiming completion
```

3. **Linting** (MANDATORY):
```bash
# Check code quality
npm run lint

# Expected: No linting errors
# If fails: Fix critical linting issues before claiming completion
```

### Code Quality Verification

4. **Duplicate Function Check**:
```bash
# Check for duplicate exports in TypeScript files
grep -r "export.*function" lib/ app/ | sort | uniq -d

# Expected: No duplicates found
# Common issue: Functions defined multiple times in same file
```

5. **Import/Export Consistency**:
```bash
# Check for missing imports
find . -name "*.ts" -exec grep -l "Promise<" {} \; | xargs grep -L "import.*Promise"

# Verify all exports are properly typed
# Verify all imports resolve correctly
```

### Integration Verification

6. **Database Schema Compatibility**:
- Verify migrations can run without errors
- Test RLS policies don't block legitimate operations
- Confirm indexes improve query performance

7. **API Endpoint Testing**:
```bash
# Test API endpoints return expected responses
curl -X GET http://localhost:3000/api/onboarding/status
# Expected: Valid response, not 500 error
```

### Memory Guidelines

**BEFORE claiming "production ready":**
- [ ] ✅ Build compiles successfully (`npm run build`)
- [ ] ✅ TypeScript types are valid (`npx tsc --noEmit`)
- [ ] ✅ No duplicate function definitions
- [ ] ✅ All imports resolve correctly
- [ ] ✅ API endpoints return valid responses
- [ ] ✅ Database operations work as expected
- [ ] ✅ No critical linting errors

**NEVER assume:**
- "It should work" without testing
- "Small changes won't break compilation"
- "TypeScript will catch all issues"
- "The agents implemented it correctly"

### Verification Commands Template

```bash
# Production Readiness Verification Script
echo "🔍 Verifying Production Readiness..."

echo "1. Building application..."
npm run build || { echo "❌ Build failed"; exit 1; }

echo "2. Type checking..."
npx tsc --noEmit || { echo "❌ Type errors found"; exit 1; }

echo "3. Checking for duplicates..."
if grep -r "export.*function" lib/ app/ | sort | uniq -d | grep -q .; then
  echo "❌ Duplicate function exports found"
  exit 1
fi

echo "4. Linting..."
npm run lint || { echo "⚠️ Linting issues found"; }

echo "✅ Production readiness verified!"
```

### Epic Completion Protocol

**Before marking epic as complete:**

1. **Run verification script** in epic worktree
2. **Test in clean environment** (new terminal/session)
3. **Verify deployment builds** on staging/preview
4. **Document any known limitations** or incomplete features
5. **Create realistic status report** based on actual verification

### Learning from This Issue

**What went wrong:**
- Claimed "production ready" without compilation check
- Duplicate function `getOrganizationById` in same file
- Build failed on deployment due to webpack compilation error

**Prevention:**
- ALWAYS run `npm run build` before claiming completion
- Use automated verification scripts
- Never trust implementation claims without verification
- Test in clean environment before final claims

### Quick Verification Commands

```bash
# Essential checks (run these EVERY TIME):
npm run build                    # Must pass
npx tsc --noEmit                # Must pass
npm run lint                    # Should pass

# Quality checks:
grep -r "export.*function" lib/ app/ | sort | uniq -d  # Should be empty
```

**Remember: "Production ready" means it actually works, not that it should work!**