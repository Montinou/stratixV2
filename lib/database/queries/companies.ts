import { eq, desc, sql, count } from 'drizzle-orm';
import { getDrizzleDb } from '../client';
import { companies, profiles } from '../schema';
import type { 
  Company, 
  InsertCompany, 
  UpdateCompany,
  Profile 
} from '../types';

export interface CompanyWithStats extends Company {
  profilesCount: number;
  departments: string[];
}

export class CompaniesRepository {
  private db = getDrizzleDb();

  /**
   * Get all companies
   * Basic company listing for admin and selection dropdowns
   */
  async getAll(): Promise<Company[]> {
    try {
      const results = await this.db
        .select()
        .from(companies)
        .orderBy(desc(companies.createdAt));

      return results;

    } catch (error) {
      console.error('Error fetching all companies:', error);
      throw error;
    }
  }

  /**
   * Get company by ID
   * Used for company detail views and validation
   */
  async getById(id: string): Promise<Company | null> {
    try {
      const results = await this.db
        .select()
        .from(companies)
        .where(eq(companies.id, id))
        .limit(1);

      return results.length > 0 ? results[0] : null;

    } catch (error) {
      console.error('Error fetching company by ID:', error);
      throw error;
    }
  }

  /**
   * Get company with statistics and profiles
   * Used for company management dashboard
   */
  async getByIdWithStats(id: string): Promise<CompanyWithStats | null> {
    try {
      // Get company details
      const company = await this.getById(id);
      if (!company) {
        return null;
      }

      // Get profiles count
      const profilesCountResult = await this.db
        .select({
          count: count()
        })
        .from(profiles)
        .where(eq(profiles.companyId, id));

      const profilesCount = profilesCountResult[0]?.count || 0;

      // Get unique departments
      const departmentsResult = await this.db
        .selectDistinct({
          department: profiles.department
        })
        .from(profiles)
        .where(eq(profiles.companyId, id));

      const departments = departmentsResult
        .map(row => row.department)
        .filter(Boolean);

      return {
        ...company,
        profilesCount: Number(profilesCount),
        departments
      };

    } catch (error) {
      console.error('Error fetching company with stats:', error);
      throw error;
    }
  }

  /**
   * Create a new company
   * Used for company registration and admin creation
   */
  async create(companyData: Omit<InsertCompany, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company> {
    try {
      const results = await this.db
        .insert(companies)
        .values({
          name: companyData.name,
          description: companyData.description,
          industry: companyData.industry,
          size: companyData.size,
        })
        .returning();

      const created = results[0];

      return {
        id: created.id,
        name: created.name,
        description: created.description,
        industry: created.industry,
        size: created.size,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };

    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  }

  /**
   * Update an existing company
   * Maintains exact API compatibility for company updates
   */
  async update(id: string, updates: UpdateCompany): Promise<Company> {
    try {
      // Build update object
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Only include fields that are actually being updated
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.industry !== undefined) updateData.industry = updates.industry;
      if (updates.size !== undefined) updateData.size = updates.size;

      const results = await this.db
        .update(companies)
        .set(updateData)
        .where(eq(companies.id, id))
        .returning();

      if (results.length === 0) {
        throw new Error(`Company with ID ${id} not found`);
      }

      const updated = results[0];

      return {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        industry: updated.industry,
        size: updated.size,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };

    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  }

  /**
   * Delete a company
   * Used for company removal (will cascade delete profiles)
   */
  async delete(id: string): Promise<void> {
    try {
      await this.db
        .delete(companies)
        .where(eq(companies.id, id));

    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  }

  /**
   * Get companies with profile counts
   * Used for admin dashboard and company listing with stats
   * Fixed: Optimized to avoid N+1 query problem
   */
  async getAllWithStats(): Promise<CompanyWithStats[]> {
    try {
      // Single query to get all companies with their profile counts and departments
      const results = await this.db
        .select({
          // Company fields
          id: companies.id,
          name: companies.name,
          description: companies.description,
          industry: companies.industry,
          size: companies.size,
          createdAt: companies.createdAt,
          updatedAt: companies.updatedAt,
          // Aggregated profile count
          profilesCount: count(profiles.userId),
        })
        .from(companies)
        .leftJoin(profiles, eq(companies.id, profiles.companyId))
        .groupBy(
          companies.id,
          companies.name,
          companies.description,
          companies.industry,
          companies.size,
          companies.createdAt,
          companies.updatedAt
        )
        .orderBy(desc(companies.createdAt));

      // Get departments for all companies in a separate optimized query
      const departmentsResults = await this.db
        .selectDistinct({
          companyId: profiles.companyId,
          department: profiles.department
        })
        .from(profiles)
        .where(sql`${profiles.department} IS NOT NULL`);

      // Group departments by company ID
      const departmentsByCompany = departmentsResults.reduce<Record<string, string[]>>((acc, row) => {
        if (row.companyId) {
          if (!acc[row.companyId]) {
            acc[row.companyId] = [];
          }
          if (row.department) {
            acc[row.companyId].push(row.department);
          }
        }
        return acc;
      }, {});

      // Combine results
      return results.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        industry: row.industry,
        size: row.size,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        profilesCount: Number(row.profilesCount),
        departments: departmentsByCompany[row.id] || []
      }));

    } catch (error) {
      console.error('Error fetching companies with stats:', error);
      throw error;
    }
  }

  /**
   * Get company by name (for validation and lookups)
   * Used to prevent duplicate company names
   */
  async getByName(name: string): Promise<Company | null> {
    try {
      const results = await this.db
        .select()
        .from(companies)
        .where(eq(companies.name, name))
        .limit(1);

      return results.length > 0 ? results[0] : null;

    } catch (error) {
      console.error('Error fetching company by name:', error);
      throw error;
    }
  }

  /**
   * Get companies by industry
   * Used for industry-based filtering and analytics
   */
  async getByIndustry(industry: string): Promise<Company[]> {
    try {
      const results = await this.db
        .select()
        .from(companies)
        .where(eq(companies.industry, industry))
        .orderBy(desc(companies.createdAt));

      return results;

    } catch (error) {
      console.error('Error fetching companies by industry:', error);
      throw error;
    }
  }

  /**
   * Get companies by size category
   * Used for size-based filtering and analytics
   */
  async getBySize(size: string): Promise<Company[]> {
    try {
      const results = await this.db
        .select()
        .from(companies)
        .where(eq(companies.size, size))
        .orderBy(desc(companies.createdAt));

      return results;

    } catch (error) {
      console.error('Error fetching companies by size:', error);
      throw error;
    }
  }

  /**
   * Search companies by name (partial match)
   * Used for search functionality in admin panels
   */
  async searchByName(searchTerm: string): Promise<Company[]> {
    try {
      const results = await this.db
        .select()
        .from(companies)
        .where(sql`${companies.name} ILIKE ${`%${searchTerm}%`}`)
        .orderBy(desc(companies.createdAt));

      return results;

    } catch (error) {
      console.error('Error searching companies by name:', error);
      throw error;
    }
  }
}