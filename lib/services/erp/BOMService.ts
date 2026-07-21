import { createClient } from '@/lib/supabase/client';
import type { BOM, BOMItem } from '@/types/erp';

const supabase = createClient();

export class BOMService {
  static async getBOMsForVariant(variantId: string): Promise<BOM[]> {
    const { data, error } = await supabase
      .from('boms')
      .select('*, items:bom_items(*, material:materials(*))')
      .eq('variant_id', variantId)
      .order('version', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  static async getActiveBOMForVariant(variantId: string): Promise<BOM | null> {
    const { data, error } = await supabase
      .from('boms')
      .select('*, items:bom_items(*, material:materials(*))')
      .eq('variant_id', variantId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data;
  }

  static async createBOM(bom: Partial<BOM>, items: Partial<BOMItem>[]): Promise<BOM> {
    // Basic implementation (in a real app, use Supabase RPC for transactions)
    const { data: newBOM, error: bomError } = await supabase.from('boms').insert(bom).select().single();
    if (bomError) throw new Error(bomError.message);

    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({ ...item, bom_id: newBOM.id }));
      const { error: itemsError } = await supabase.from('bom_items').insert(itemsToInsert);
      if (itemsError) throw new Error(itemsError.message);
    }

    return this.getActiveBOMForVariant(newBOM.variant_id) as Promise<BOM>;
  }

  static async deactivateBOM(bomId: string): Promise<void> {
    const { error } = await supabase.from('boms').update({ is_active: false, effective_to: new Date().toISOString() }).eq('id', bomId);
    if (error) throw new Error(error.message);
  }
}



