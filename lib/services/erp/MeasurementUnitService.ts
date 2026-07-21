import { createClient } from '@/lib/supabase/client';
import type { MeasurementUnit } from '@/types/erp';

export class MeasurementUnitService {
  static async getMeasurementUnits(): Promise<MeasurementUnit[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('measurement_units')
      .select('*')
      .is('deleted_at', null)
      .order('name');
      
    if (error) throw error;
    return data || [];
  }

  static async getMeasurementUnitById(id: string): Promise<MeasurementUnit | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('measurement_units')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async createMeasurementUnit(unit: Partial<MeasurementUnit>): Promise<MeasurementUnit> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('measurement_units')
      .insert([unit])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  static async updateMeasurementUnit(id: string, updates: Partial<MeasurementUnit>): Promise<MeasurementUnit> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('measurement_units')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  static async softDeleteMeasurementUnit(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('measurement_units')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
      
    if (error) throw error;
  }
}
