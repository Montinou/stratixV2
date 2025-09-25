---
issue: 004
title: Migrate companies page to API endpoints
analyzed: 2025-09-25T04:36:45Z
estimated_hours: 6-8
parallelization_factor: 3.5
---

# Parallel Work Analysis: Issue #004

## Overview
Migration of `/app/companies/page.tsx` from direct Supabase client calls to API endpoints. The page handles company management functionality with role-based access control for corporativo users.

## Parallel Streams

### Stream A: API Integration Layer
**Scope**: Replace Supabase calls with fetch API calls
**Files**:
- `/app/companies/page.tsx` (lines 44-62: fetchCompanies function)
- `/app/companies/page.tsx` (lines 64-99: handleSave function)
**Agent Type**: frontend-architect
**Can Start**: immediately
**Estimated Hours**: 3
**Dependencies**: none

### Stream B: Role-Based Access Control
**Scope**: Enhance role validation and error handling
**Files**:
- `/app/companies/page.tsx` (lines 34-42: role checking logic)
- `/app/companies/page.tsx` (lines 111-131: restricted access UI)
**Agent Type**: frontend-architect
**Can Start**: immediately
**Estimated Hours**: 2
**Dependencies**: none

### Stream C: Form State Management
**Scope**: Update form handling for API compatibility
**Files**:
- `/app/companies/page.tsx` (lines 30-31: form state)
- `/app/companies/page.tsx` (lines 101-109: form dialog logic)
- `/app/companies/page.tsx` (lines 141-181: dialog component)
**Agent Type**: ui-architect
**Can Start**: immediately
**Estimated Hours**: 2
**Dependencies**: none

### Stream D: Loading States & Error Handling
**Scope**: Implement proper loading states and error feedback for API calls
**Files**:
- `/app/companies/page.tsx` (lines 28-29: loading state)
- `/app/companies/page.tsx` (lines 184-188: loading spinner)
- Error handling throughout CRUD operations
**Agent Type**: frontend-architect
**Can Start**: immediately
**Estimated Hours**: 1.5
**Dependencies**: none

## Coordination Points
- API response format standardization (enhanced format: `{ success: boolean, data?: T, error?: string }`)
- Form state synchronization between dialog and main component
- Loading state management across different operations

## Conflict Risk Assessment
**Low Risk** - Streams work on different functional areas of the same file with minimal overlap

## Parallelization Strategy
**Recommended Approach**: parallel
- Stream A and Stream D can coordinate on error handling patterns
- Stream B and Stream C are completely independent
- All streams merge cleanly as they touch different functional concerns

## Expected Timeline
With parallel execution:
- Wall time: 3 hours
- Total work: 8.5 hours
- Efficiency gain: 65%

## Notes
- Existing API endpoints at `/api/companies` are already functional
- Role-based filtering handled server-side
- Company settings stored as JSON objects
- Must maintain existing workflow patterns for user experience continuity