import { createClient } from '@/lib/supabase/client';
import type { Gemstone, GemstoneLot } from '@/types/erp';

export class GemstoneService {
  /**
   * Convert grams to display carats (1g = 5.0 ct)
   */
  static convertGramToCarat(weightGrams: number): number {
    return parseFloat((weightGrams * 5.0).toFixed(3));
  }

  /**
   * Convert carats to authoritative base grams (1 ct = 0.2 g)
   */
  static convertCaratToGram(carats: number): number {
    return parseFloat((carats * 0.2).toFixed(4));
  }

  /**
   * List all active gemstones with optional filters
   */
  static async listGemstones(filters?: {
    category?: string;
    stone_type?: string;
    color?: string;
    shape?: string;
    search?: string;
  }): Promise<Gemstone[]> {
    const supabase = createClient();
    let query = supabase
      .from('gemstones')
      .select('*, lots:gemstone_lots(*)')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.stone_type) query = query.eq('stone_type', filters.stone_type);
    if (filters?.color) query = query.eq('color', filters.color);
    if (filters?.shape) query = query.eq('shape', filters.shape);
    if (filters?.search) {
      query = query.or(
        `name_ar.ilike.%${filters.search}%,name_en.ilike.%${filters.search}%,code.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list gemstones: ${error.message}`);
    return data || [];
  }

  /**
   * Get single gemstone by ID with its lots
   */
  static async getGemstoneById(id: string): Promise<Gemstone | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gemstones')
      .select('*, lots:gemstone_lots(*)')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch gemstone #${id}: ${error.message}`);
    }
    return data;
  }

  /**
   * Create a new Gemstone Master definition
   */
  static async createGemstone(gemstoneData: Partial<Gemstone>): Promise<Gemstone> {
    const supabase = createClient();

    const weightGrams = Number(gemstoneData.weight_grams || 0);
    const weightCarats =
      gemstoneData.weight_carats !== undefined
        ? Number(gemstoneData.weight_carats)
        : this.convertGramToCarat(weightGrams);

    const payload = {
      ...gemstoneData,
      weight_grams: weightGrams,
      weight_carats: weightCarats,
      cut: gemstoneData.cut || 'Brilliant',
      quality: gemstoneData.quality || 'AAA',
      treatment: gemstoneData.treatment || 'Natural',
      quantity: Number(gemstoneData.quantity || 0),
      purchase_price: Number(gemstoneData.purchase_price || 0),
      selling_price: Number(gemstoneData.selling_price || 0),
      is_active: gemstoneData.is_active ?? true
    };

    const { data, error } = await supabase
      .from('gemstones')
      .insert([payload])
      .select()
      .single();

    if (error) throw new Error(`Failed to create gemstone: ${error.message}`);
    return data;
  }

  /**
   * Intake a new Gemstone Parcel / Lot from supplier
   */
  static async createGemstoneLot(lotData: Partial<GemstoneLot>): Promise<GemstoneLot> {
    const supabase = createClient();

    const initialQty = Number(lotData.initial_quantity || 0);
    const weightGrams = Number(lotData.weight_grams || 0);
    const weightCarats =
      lotData.weight_carats !== undefined
        ? Number(lotData.weight_carats)
        : this.convertGramToCarat(weightGrams);

    const payload = {
      ...lotData,
      initial_quantity: initialQty,
      available_quantity: initialQty,
      reserved_quantity: 0,
      weight_grams: weightGrams,
      weight_carats: weightCarats
    };

    const { data, error } = await supabase
      .from('gemstone_lots')
      .insert([payload])
      .select()
      .single();

    if (error) throw new Error(`Failed to create gemstone lot: ${error.message}`);

    // Update parent gemstone total bulk balance
    if (lotData.gemstone_id) {
      const { data: currentStone } = await supabase
        .from('gemstones')
        .select('quantity, weight_grams')
        .eq('id', lotData.gemstone_id)
        .single();

      if (currentStone) {
        const updatedQty = (currentStone.quantity || 0) + initialQty;
        const updatedWeight = (currentStone.weight_grams || 0) + weightGrams;

        await supabase
          .from('gemstones')
          .update({
            quantity: updatedQty,
            weight_grams: updatedWeight,
            weight_carats: this.convertGramToCarat(updatedWeight)
          })
          .eq('id', lotData.gemstone_id);
      }
    }

    return data;
  }
}
