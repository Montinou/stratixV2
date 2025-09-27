---
issue: 70
title: Core Form Steps Implementation
analyzed: 2025-09-27T19:31:29Z
estimated_hours: 14-18
parallelization_factor: 4.0
---

# Parallel Work Analysis: Issue #70

## Overview
Implement the four main wizard steps with comprehensive form handling, validation, and user experience features including Welcome, Company Info, Organization, and Completion steps with AI-enhanced suggestions.

## Parallel Streams

### Stream A: Welcome & Experience Step
**Scope**: Welcome step implementation with role selection
**Files**:
- `app/onboarding/welcome/components/WelcomeStep.tsx`
- `app/onboarding/welcome/components/RoleSelector.tsx`
- `app/onboarding/welcome/components/ExperienceLevel.tsx`
**Agent Type**: ui-ux-designer
**Can Start**: After Task #69 foundation
**Estimated Hours**: 3-4 hours
**Dependencies**: WizardContainer and basic routing from Task #69

### Stream B: Company Information Step
**Scope**: Company info with AI-powered suggestions
**Files**:
- `app/onboarding/company/components/CompanyInfoStep.tsx`
- `app/onboarding/company/components/IndustrySelector.tsx`
- `app/onboarding/company/components/CompanySizeSelector.tsx`
- `app/onboarding/company/components/LogoUpload.tsx`
**Agent Type**: ai-ml-integration-specialist
**Can Start**: After Task #69 foundation
**Estimated Hours**: 4-5 hours
**Dependencies**: WizardContainer, AI service basic setup

### Stream C: Organization & Team Setup
**Scope**: Organization step with team structure
**Files**:
- `app/onboarding/organization/components/OrganizationStep.tsx`
- `app/onboarding/organization/components/TeamStructure.tsx`
- `app/onboarding/organization/components/MethodologySelector.tsx`
- `app/onboarding/organization/components/IntegrationPreferences.tsx`
**Agent Type**: ui-ux-designer
**Can Start**: After Task #69 foundation
**Estimated Hours**: 3-4 hours
**Dependencies**: WizardContainer and form validation patterns

### Stream D: Completion & AI Recommendations
**Scope**: Final step with AI-generated insights
**Files**:
- `app/onboarding/complete/components/CompletionStep.tsx`
- `app/onboarding/complete/components/OnboardingSummary.tsx`
- `app/onboarding/complete/components/RecommendationCard.tsx`
- `app/onboarding/complete/components/NextStepsRoadmap.tsx`
**Agent Type**: ai-ml-integration-specialist
**Can Start**: After Task #69 foundation
**Estimated Hours**: 3-4 hours
**Dependencies**: WizardContainer, AI recommendation service

### Stream E: Form Validation & Hooks
**Scope**: Shared form infrastructure and validation
**Files**:
- `lib/hooks/use-onboarding-form.ts`
- `lib/hooks/use-industry-suggestions.ts`
- `lib/hooks/use-ai-recommendations.ts`
- `lib/validations/onboarding-schemas.ts`
**Agent Type**: Developer-Agent
**Can Start**: Immediately (parallel with other streams)
**Estimated Hours**: 2-3 hours
**Dependencies**: Basic type definitions from Task #69

## Coordination Points
- **Form Validation Schemas**: Stream E must be completed before other streams can implement validation
- **AI Service Integration**: Streams B and D need AI service endpoints
- **Component Styling**: All streams must follow shadcn/ui patterns established in Task #69

## Conflict Risk Assessment
**Medium Risk** - Multiple teams working on form components with shared validation logic

## Parallelization Strategy
1. **Phase 1** (Parallel): Launch Stream E for shared infrastructure
2. **Phase 2** (Parallel): Launch Streams A, B, C, D simultaneously after Stream E basics
3. **Phase 3** (Integration): Combine all form steps with validation and AI services

**Total Estimated Hours**: 14-18 hours
**With Parallelization**: 8-10 hours (45% time savings)