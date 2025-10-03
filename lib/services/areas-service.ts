import { eq, sql, isNull, and } from 'drizzle-orm';
import { withRLSContext } from '@/lib/database/rls-client';
import { areas } from '@/db/okr-schema';
import { profiles } from '@/db/okr-schema';

export interface Area {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  parentAreaId: string | null;
  managerId: string | null;
  headcount: number;
  status: 'active' | 'inactive' | 'planning';
  color: string | null;
  icon: string | null;
  createdBy: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  parentAreaName?: string | null;
  managerName?: string | null;
}

export interface CreateAreaInput {
  name: string;
  description?: string;
  code?: string;
  parentAreaId?: string;
  managerId?: string;
  headcount?: number;
  status?: 'active' | 'inactive' | 'planning';
  color?: string;
  icon?: string;
  createdBy: string;
  companyId: string;
}

export interface UpdateAreaInput {
  name?: string;
  description?: string;
  code?: string;
  parentAreaId?: string;
  managerId?: string;
  headcount?: number;
  status?: 'active' | 'inactive' | 'planning';
  color?: string;
  icon?: string;
}

// Get all areas for a user/organization
export async function getAreasForPage(userId: string): Promise<Area[]> {
  return withRLSContext(userId, async (db) => {
    const result = await db
      .select({
        id: areas.id,
        name: areas.name,
        description: areas.description,
        code: areas.code,
        parentAreaId: areas.parentAreaId,
        managerId: areas.managerId,
        headcount: areas.headcount,
        status: areas.status,
        color: areas.color,
        icon: areas.icon,
        createdBy: areas.createdBy,
        companyId: areas.companyId,
        createdAt: areas.createdAt,
        updatedAt: areas.updatedAt,
        parentAreaName: sql<string>`parent_area.name`,
        managerName: sql<string>`manager_profile.full_name`
      })
      .from(areas)
      .leftJoin(
        sql`${areas} as parent_area`,
        sql`parent_area.id = ${areas.parentAreaId}`
      )
      .leftJoin(
        sql`${profiles} as manager_profile`,
        sql`manager_profile.id = ${areas.managerId}`
      )
      .orderBy(areas.name);

    return result as Area[];
  });
}

// Get area statistics
export async function getAreaStats(userId: string) {
  return withRLSContext(userId, async (db) => {
    const result = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(case when status = 'active' then 1 end)`,
        inactive: sql<number>`count(case when status = 'inactive' then 1 end)`,
        planning: sql<number>`count(case when status = 'planning' then 1 end)`,
        totalHeadcount: sql<number>`coalesce(sum(headcount), 0)`
      })
      .from(areas);

    const stats = result[0];

    return {
      total: Number(stats?.total) || 0,
      active: Number(stats?.active) || 0,
      inactive: Number(stats?.inactive) || 0,
      planning: Number(stats?.planning) || 0,
      totalHeadcount: Number(stats?.totalHeadcount) || 0
    };
  });
}

// Get a single area by ID
export async function getAreaById(areaId: string, userId: string): Promise<Area | null> {
  return withRLSContext(userId, async (db) => {
    const result = await db
      .select()
      .from(areas)
      .where(eq(areas.id, areaId))
      .limit(1);

    return result[0] as Area || null;
  });
}

// Create a new area
export async function createArea(input: CreateAreaInput): Promise<Area> {
  return withRLSContext(input.createdBy, async (db) => {
    const result = await db
      .insert(areas)
      .values({
        name: input.name,
        description: input.description || null,
        code: input.code || null,
        parentAreaId: input.parentAreaId || null,
        managerId: input.managerId || null,
        headcount: input.headcount || 0,
        status: input.status || 'active',
        color: input.color || null,
        icon: input.icon || null,
        createdBy: input.createdBy,
        companyId: input.companyId
      })
      .returning();

    return result[0] as Area;
  });
}

// Update an area
export async function updateArea(areaId: string, userId: string, input: UpdateAreaInput): Promise<Area> {
  return withRLSContext(userId, async (db) => {
    const updateData: any = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.code !== undefined) updateData.code = input.code;
    if (input.parentAreaId !== undefined) updateData.parentAreaId = input.parentAreaId;
    if (input.managerId !== undefined) updateData.managerId = input.managerId;
    if (input.headcount !== undefined) updateData.headcount = input.headcount;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.icon !== undefined) updateData.icon = input.icon;

    updateData.updatedAt = sql`CURRENT_TIMESTAMP`;

    const result = await db
      .update(areas)
      .set(updateData)
      .where(eq(areas.id, areaId))
      .returning();

    return result[0] as Area;
  });
}

// Delete an area
export async function deleteArea(areaId: string, userId: string): Promise<void> {
  return withRLSContext(userId, async (db) => {
    await db
      .delete(areas)
      .where(eq(areas.id, areaId));
  });
}

// Get areas for dropdown/select
export async function getAreasForSelect(userId: string): Promise<Array<{ id: string; name: string; code: string | null }>> {
  return withRLSContext(userId, async (db) => {
    const result = await db
      .select({
        id: areas.id,
        name: areas.name,
        code: areas.code
      })
      .from(areas)
      .where(eq(areas.status, 'active'))
      .orderBy(areas.name);

    return result;
  });
}

// Get child areas of a parent
export async function getChildAreas(parentAreaId: string, userId: string): Promise<Area[]> {
  return withRLSContext(userId, async (db) => {
    const result = await db
      .select()
      .from(areas)
      .where(eq(areas.parentAreaId, parentAreaId))
      .orderBy(areas.name);

    return result as Area[];
  });
}