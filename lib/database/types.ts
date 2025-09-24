import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { 
  users, 
  companies, 
  profiles, 
  objectives, 
  initiatives, 
  activities,
  userRoleEnum,
  objectiveStatusEnum,
  initiativeStatusEnum,
  activityStatusEnum,
  priorityEnum
} from './schema';

// Inferred types for selecting (reading) from tables
export type User = InferSelectModel<typeof users>;
export type Company = InferSelectModel<typeof companies>;
export type Profile = InferSelectModel<typeof profiles>;
export type Objective = InferSelectModel<typeof objectives>;
export type Initiative = InferSelectModel<typeof initiatives>;
export type Activity = InferSelectModel<typeof activities>;

// Inferred types for inserting (creating) records
export type InsertUser = InferInsertModel<typeof users>;
export type InsertCompany = InferInsertModel<typeof companies>;
export type InsertProfile = InferInsertModel<typeof profiles>;
export type InsertObjective = InferInsertModel<typeof objectives>;
export type InsertInitiative = InferInsertModel<typeof initiatives>;
export type InsertActivity = InferInsertModel<typeof activities>;

// Enum types for better type safety in application code
export type UserRole = typeof userRoleEnum.enumValues[number];
export type ObjectiveStatus = typeof objectiveStatusEnum.enumValues[number];
export type InitiativeStatus = typeof initiativeStatusEnum.enumValues[number];
export type ActivityStatus = typeof activityStatusEnum.enumValues[number];
export type Priority = typeof priorityEnum.enumValues[number];

// Extended types with relations for common use cases
export type ObjectiveWithOwner = Objective & {
  owner?: User;
  ownerProfile?: Profile;
};

export type ObjectiveWithRelations = Objective & {
  owner?: User;
  ownerProfile?: Profile;
  company?: Company;
  initiatives?: Initiative[];
};

export type InitiativeWithOwner = Initiative & {
  owner?: User;
  ownerProfile?: Profile;
};

export type InitiativeWithRelations = Initiative & {
  objective?: Objective;
  owner?: User;
  ownerProfile?: Profile;
  activities?: Activity[];
};

export type ActivityWithAssignee = Activity & {
  assignee?: User;
  assigneeProfile?: Profile;
};

export type ActivityWithRelations = Activity & {
  initiative?: Initiative;
  assignee?: User;
  assigneeProfile?: Profile;
};

// Profile with company information
export type ProfileWithCompany = Profile & {
  user?: User;
  company?: Company;
};

// Full hierarchical type for complete OKR structure
export type ObjectiveHierarchy = Objective & {
  owner?: User;
  ownerProfile?: Profile;
  company?: Company;
  initiatives?: (Initiative & {
    owner?: User;
    ownerProfile?: Profile;
    activities?: (Activity & {
      assignee?: User;
      assigneeProfile?: Profile;
    })[];
  })[];
};

// Update types for partial updates (commonly used in services)
export type UpdateUser = Partial<Omit<User, 'id' | 'createdAt'>>;
export type UpdateCompany = Partial<Omit<Company, 'id' | 'createdAt'>>;
export type UpdateProfile = Partial<Omit<Profile, 'userId' | 'createdAt'>>;
export type UpdateObjective = Partial<Omit<Objective, 'id' | 'createdAt'>>;
export type UpdateInitiative = Partial<Omit<Initiative, 'id' | 'createdAt'>>;
export type UpdateActivity = Partial<Omit<Activity, 'id' | 'createdAt'>>;

// Utility types for filtering and queries
export type ObjectiveFilters = {
  ownerId?: string;
  companyId?: string;
  department?: string;
  status?: ObjectiveStatus;
  priority?: Priority;
  startDate?: Date;
  endDate?: Date;
};

export type InitiativeFilters = {
  objectiveId?: string;
  ownerId?: string;
  status?: InitiativeStatus;
  priority?: Priority;
  startDate?: Date;
  endDate?: Date;
};

export type ActivityFilters = {
  initiativeId?: string;
  assignedTo?: string;
  status?: ActivityStatus;
  priority?: Priority;
  dueDate?: Date;
};

export type ProfileFilters = {
  companyId?: string;
  roleType?: UserRole;
  department?: string;
};

// Dashboard and analytics types
export type ObjectiveProgressSummary = {
  id: string;
  title: string;
  status: ObjectiveStatus;
  progress: number;
  initiativesCount: number;
  completedInitiatives: number;
  totalActivities: number;
  completedActivities: number;
};

export type DepartmentSummary = {
  department: string;
  totalObjectives: number;
  completedObjectives: number;
  inProgressObjectives: number;
  averageProgress: number;
};

export type UserWorkloadSummary = {
  userId: string;
  fullName: string;
  ownedObjectives: number;
  ownedInitiatives: number;
  assignedActivities: number;
  overdueTasks: number;
};

// Form types for creating new records
export type CreateObjectiveForm = Omit<InsertObjective, 'id' | 'createdAt' | 'updatedAt' | 'progress'>;
export type CreateInitiativeForm = Omit<InsertInitiative, 'id' | 'createdAt' | 'updatedAt' | 'progress'>;
export type CreateActivityForm = Omit<InsertActivity, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateProfileForm = Omit<InsertProfile, 'createdAt' | 'updatedAt'>;
export type CreateCompanyForm = Omit<InsertCompany, 'id' | 'createdAt' | 'updatedAt'>;

// API response types for consistent API structure
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// Re-export table definitions for use in queries
export {
  users,
  companies,
  profiles,
  objectives,
  initiatives,
  activities
} from './schema';