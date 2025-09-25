---
issue: 003
title: Migrate activity form component to API endpoints
analyzed: 2025-09-25T04:36:45Z
estimated_hours: 4-6
parallelization_factor: 2.5
---

# Parallel Work Analysis: Issue #003

## Overview
Migrate `/components/okr/activity-form.tsx` from Supabase client stub to API endpoints. Similar structure to initiative form but with initiative relationship dependency. Has two main data flows: initiatives fetching and activity form submission.

## Parallel Streams

### Stream A: Initiative Data Fetching
**Scope**: Replace initiatives dropdown fetching logic with API calls
**Files**:
- `/components/okr/activity-form.tsx` (lines 37-56: fetchInitiatives function)
- Integration with `/api/initiatives` endpoint for dropdown population
**Agent Type**: frontend-architect
**Can Start**: immediately
**Estimated Hours**: 1.5-2 hours
**Dependencies**: none

### Stream B: Activity Form Submission
**Scope**: Replace activity form submission logic with API calls
**Files**:
- `/components/okr/activity-form.tsx` (lines 58-100: handleSubmit function)
- Integration with `/api/activities` POST/PUT endpoints
**Agent Type**: frontend-architect
**Can Start**: immediately  
**Estimated Hours**: 2-3 hours
**Dependencies**: none

### Stream C: Relationship Management & Validation
**Scope**: Ensure initiative-activity relationships and validation work correctly
**Files**:
- `/components/okr/activity-form.tsx` (form validation and relationship logic)
- Initiative selection validation and progress calculation updates
**Agent Type**: frontend-architect
**Can Start**: after Streams A & B establish API patterns
**Estimated Hours**: 1 hour
**Dependencies**: Streams A & B (needs both data flows working)

## Coordination Points

### Shared Files
Main coordination needed for:
- `/components/okr/activity-form.tsx` - All streams modify different parts of same file

### Sequential Requirements
Clear functional separation:
1. **Stream A** (initiatives fetching) and **Stream B** (form submission) are independent
2. **Stream C** (validation) coordinates both flows and ensures data integrity
3. Initiative-activity relationship must be preserved throughout

## Conflict Risk Assessment
- **Medium Risk**: All streams work on same file but different functions
- **Low Risk**: Clear functional boundaries (fetch vs submit vs validation)
- **Mitigation**: Function-level ownership with careful state management coordination

## Parallelization Strategy

**Recommended Approach**: hybrid

**Execution Plan**:
1. **Phase 1 (Parallel)**: Launch Streams A & B simultaneously
   - Stream A: Focus on `fetchInitiatives` function and initiatives dropdown
   - Stream B: Focus on `handleSubmit` function and activity CRUD operations
2. **Phase 2 (Integration)**: Stream C validates relationships and form logic
3. **Phase 3**: Joint testing of initiative-activity workflows

## Expected Timeline

With parallel execution:
- **Wall time**: 2.5-3 hours (max of A & B, plus C)
- **Total work**: 4.5-6 hours
- **Efficiency gain**: 50%

Without parallel execution:
- **Wall time**: 4.5-6 hours (sequential)

## Notes

**Key Implementation Details**:
- **API Endpoints**: `/api/initiatives` (GET) for dropdown, `/api/activities` (POST/PUT) for form
- **Current Pattern**: Using client stub - needs complete replacement with fetch calls
- **Data Relationships**: Activities must maintain `initiative_id` foreign key relationship
- **Role-based Filtering**: Currently client-side for initiatives - should use server-side API
- **Progress Tracking**: Activities contribute to initiative progress calculations

**Coordination Strategy**:
- Stream A updates initiatives fetching and dropdown state management
- Stream B updates activity submission and loading/success states
- Stream C ensures initiative-activity relationships remain intact
- Validate that progress calculations trigger correctly after activity updates

**Critical Dependencies**:
- `/api/initiatives` GET endpoint with role-based filtering
- `/api/activities` POST/PUT endpoints with initiative relationship validation
- Initiative selection must work correctly for activity creation/editing
- Activity progress updates should trigger initiative progress recalculation

**Success Metrics**:
- Activity forms submit successfully for both create/edit scenarios
- Initiative dropdown populates correctly from API
- Initiative-activity relationships maintained
- Progress calculations work correctly after activity updates
- No TypeScript compilation errors