import { createClient } from '@/lib/supabase/client';
import type { Supplier } from '@/types/erp';

const supabase = createClient();

export class SupplierService {
  static async getSuppliers(options?: { page?: number; pageSize?: number; search?: string }): Promise<{ data: Supplier[]; count: number }> {
    let query = supabase.from('suppliers').select('*', { count: 'exact' });

    if (options?.search) {
      query = query.or(`name.ilike.%${options.search}%,code.ilike.%${options.search}%`);
    }

    if (options?.page && options?.pageSize) {
      const from = (options.page - 1) * options.pageSize;
      query = query.range(from, from + options.pageSize - 1);
    }

    query = query.order('name', { ascending: true });

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    return { data: data || [], count: count || 0 };
  }

  static async getSupplierById(id: string): Promise<Supplier | null> {
    const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data;
  }

  static async createSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
    const { data, error } = await supabase.from('suppliers').insert(supplier).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    const { data, error } = await supabase.from('suppliers').update(updates).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async deleteSupplier(id: string): Promise<void> {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}



