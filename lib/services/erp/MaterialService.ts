import { createClient } from '@/lib/supabase/client';
import type { Material } from '@/types/catalog';

const supabase = createClient();

export class MaterialService {
  static async getMaterials(options?: { page?: number; pageSize?: number; search?: string }): Promise<{ data: Material[]; count: number }> {
    let query = supabase.from('materials').select('*', { count: 'exact' });

    if (options?.search) {
      query = query.or(`name_en.ilike.%${options.search}%,name_ar.ilike.%${options.search}%`);
    }

    if (options?.page && options?.pageSize) {
      const from = (options.page - 1) * options.pageSize;
      query = query.range(from, from + options.pageSize - 1);
    }

    query = query.order('name_en', { ascending: true });

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    return { data: data || [], count: count || 0 };
  }

  static async getMaterialById(id: string): Promise<Material | null> {
    const { data, error } = await supabase.from('materials').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data;
  }

  static async createMaterial(material: Partial<Material>): Promise<Material> {
    const { data, error } = await supabase.from('materials').insert(material).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async updateMaterial(id: string, updates: Partial<Material>): Promise<Material> {
    const { data, error } = await supabase.from('materials').update(updates).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async deleteMaterial(id: string): Promise<void> {
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}



