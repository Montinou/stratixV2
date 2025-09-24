# OKR API Endpoints Summary

## Overview
Complete REST API implementation for OKR (Objectives and Key Results) management using Drizzle ORM with NeonDB. All endpoints implement role-based access control, comprehensive validation, and maintain backward compatibility with existing frontend code.

## Authentication & Authorization

All endpoints expect the following query parameters for access control:
- `userId`: Current user ID
- `userRole`: User role (`empleado`, `gerente`, `corporativo`) 
- `userDepartment`: User department

### Access Levels:
- **Empleado**: Own objectives and assigned activities only
- **Gerente**: All data within their department
- **Corporativo**: All data across the organization

## Objectives API

### Base URL: `/api/objectives`

#### GET `/api/objectives`
Get all objectives with role-based filtering.

**Query Parameters:**
- `userId` (required): User ID
- `userRole` (required): User role
- `userDepartment` (required): User department

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "department": "string",
      "status": "draft|in_progress|completed|cancelled",
      "priority": "low|medium|high",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "owner_id": "uuid",
      "company_id": "uuid",
      "progress": 75,
      "created_at": "ISO datetime",
      "updated_at": "ISO datetime",
      "owner": {
        "full_name": "string",
        "role_type": "string"
      }
    }
  ]
}
```

#### POST `/api/objectives`
Create a new objective.

**Body:**
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "department": "string (required)",
  "status": "draft|in_progress|completed|cancelled (required)",
  "priority": "low|medium|high (required)",
  "start_date": "YYYY-MM-DD (required)",
  "end_date": "YYYY-MM-DD (required)",
  "owner_id": "uuid (required)",
  "company_id": "uuid (required)",
  "progress": "number 0-100 (optional)"
}
```

#### GET `/api/objectives/[id]`
Get specific objective by ID.

**Query Parameters:**
- `userId` (required): For access control

#### PUT `/api/objectives/[id]`
Update existing objective (partial updates supported).

**Body:** Same as POST but all fields optional

#### DELETE `/api/objectives/[id]`
Delete objective by ID.

## Initiatives API

### Base URL: `/api/initiatives`

#### GET `/api/initiatives`
Get all initiatives with role-based filtering.

**Query Parameters:**
- `userId` (required): User ID
- `userRole` (required): User role  
- `userDepartment` (required): User department
- `objectiveId` (optional): Filter by specific objective

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "objective_id": "uuid",
      "title": "string",
      "description": "string",
      "status": "planning|in_progress|completed|cancelled",
      "priority": "low|medium|high",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD", 
      "owner_id": "uuid",
      "progress": 60,
      "created_at": "ISO datetime",
      "updated_at": "ISO datetime",
      "owner": {
        "full_name": "string",
        "role_type": "string"
      },
      "objective_title": "string"
    }
  ]
}
```

#### POST `/api/initiatives`
Create a new initiative.

**Body:**
```json
{
  "objective_id": "uuid (required)",
  "title": "string (required)",
  "description": "string (optional)",
  "status": "planning|in_progress|completed|cancelled (required)",
  "priority": "low|medium|high (required)",
  "start_date": "YYYY-MM-DD (required)",
  "end_date": "YYYY-MM-DD (required)",
  "owner_id": "uuid (required)",
  "progress": "number 0-100 (optional)"
}
```

#### GET `/api/initiatives/[id]`
Get specific initiative by ID.

**Query Parameters:**
- `includeActivities` (optional): Include related activities (boolean)

#### PUT `/api/initiatives/[id]`
Update existing initiative (partial updates supported).

#### DELETE `/api/initiatives/[id]`
Delete initiative by ID.

#### GET `/api/initiatives/[id]/progress`
Get calculated progress based on activities.

**Response:**
```json
{
  "data": {
    "initiative_id": "uuid",
    "calculated_progress": 75,
    "current_progress": 60
  }
}
```

#### PATCH `/api/initiatives/[id]/progress`
Update initiative progress based on completed activities.

## Activities API

### Base URL: `/api/activities`

#### GET `/api/activities`
Get all activities with role-based filtering and multiple filter options.

**Query Parameters:**
- `userId` (required): User ID
- `userRole` (required): User role
- `userDepartment` (required): User department
- `initiativeId` (optional): Filter by initiative
- `assigneeId` (optional): Filter by assignee
- `status` (optional): Filter by status
- `priority` (optional): Filter by priority
- `overdue` (optional): Show overdue activities only

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "initiative_id": "uuid", 
      "title": "string",
      "description": "string",
      "status": "todo|in_progress|completed|cancelled",
      "priority": "low|medium|high",
      "due_date": "YYYY-MM-DD",
      "assigned_to": "uuid",
      "created_at": "ISO datetime",
      "updated_at": "ISO datetime",
      "assignee": {
        "full_name": "string",
        "role_type": "string"
      },
      "initiative_title": "string",
      "objective_title": "string"
    }
  ]
}
```

#### POST `/api/activities`
Create a new activity.

**Body:**
```json
{
  "initiative_id": "uuid (required)",
  "title": "string (required)",
  "description": "string (optional)",
  "status": "todo|in_progress|completed|cancelled (required)",
  "priority": "low|medium|high (required)",
  "due_date": "YYYY-MM-DD (required)",
  "assigned_to": "uuid (required)"
}
```

#### GET `/api/activities/[id]`
Get specific activity by ID.

#### PUT `/api/activities/[id]`
Update existing activity (partial updates supported).

#### DELETE `/api/activities/[id]`  
Delete activity by ID.

#### GET `/api/activities/stats/[initiativeId]`
Get completion statistics for activities in an initiative.

**Response:**
```json
{
  "data": {
    "total": 10,
    "completed": 7,
    "inProgress": 2,
    "todo": 1,
    "cancelled": 0,
    "completionPercentage": 70
  }
}
```

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "error": "Missing required fields: title, status"
}
```

**404 Not Found:**
```json
{
  "error": "Objective not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error while fetching objectives"
}
```

## Data Validation

### Enum Values
- **Status (Objectives)**: `draft`, `in_progress`, `completed`, `cancelled`
- **Status (Initiatives)**: `planning`, `in_progress`, `completed`, `cancelled`
- **Status (Activities)**: `todo`, `in_progress`, `completed`, `cancelled`
- **Priority**: `low`, `medium`, `high`
- **User Roles**: `empleado`, `gerente`, `corporativo`

### Date Formats
- All dates must be in ISO 8601 format (`YYYY-MM-DD`)
- `end_date` must be after `start_date`

### Numeric Ranges
- **Progress**: 0-100 (integer)

## Integration Notes

1. **Type Safety**: All endpoints use TypeScript with Drizzle ORM for compile-time safety
2. **Database**: Designed for NeonDB (PostgreSQL) with connection pooling
3. **Frontend Compatibility**: Response formats maintain exact compatibility with existing frontend expectations
4. **Performance**: Optimized queries with proper joins and indexing
5. **Security**: Role-based access control implemented at the repository level