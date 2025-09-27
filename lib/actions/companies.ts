'use server'

import { revalidatePath } from 'next/cache';
import { CompaniesService, type Company } from '@/lib/database/services';
import { stackServerApp } from '@/stack';

export async function getCompanies(): Promise<{ data: Company[] | null; error?: string }> {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const companies = await CompaniesService.getAll();
    return { data: companies };
  } catch (error) {
    console.error('Error fetching companies:', error);
    return { data: null, error: 'Failed to fetch companies' };
  }
}

export async function getCompany(id: string): Promise<{ data: Company | null; error?: string }> {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const company = await CompaniesService.getById(id);
    return { data: company };
  } catch (error) {
    console.error('Error fetching company:', error);
    return { data: null, error: 'Failed to fetch company' };
  }
}

export async function createCompany(
  companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: Company | null; error?: string }> {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const company = await CompaniesService.create(companyData);

    revalidatePath('/companies');
    return { data: company };
  } catch (error) {
    console.error('Error creating company:', error);
    return { data: null, error: 'Failed to create company' };
  }
}

export async function updateCompany(
  id: string,
  updates: Partial<Company>
): Promise<{ data: Company | null; error?: string }> {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const company = await CompaniesService.update(id, updates);

    revalidatePath('/companies');
    return { data: company };
  } catch (error) {
    console.error('Error updating company:', error);
    return { data: null, error: 'Failed to update company' };
  }
}

export async function deleteCompany(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    await CompaniesService.delete(id);

    revalidatePath('/companies');
    return { success: true };
  } catch (error) {
    console.error('Error deleting company:', error);
    return { success: false, error: 'Failed to delete company' };
  }
}