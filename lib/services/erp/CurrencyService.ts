import { createClient } from '@/lib/supabase/client';
import type { Currency } from '@/types/erp';

export class CurrencyService {
  static async getCurrencies(): Promise<Currency[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('currencies')
      .select('*')
      .is('deleted_at', null)
      .order('code');
      
    if (error) throw error;
    return data || [];
  }

  static async getCurrencyById(id: string): Promise<Currency | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('currencies')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async createCurrency(currency: Partial<Currency>): Promise<Currency> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('currencies')
      .insert([currency])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  static async updateCurrency(id: string, updates: Partial<Currency>): Promise<Currency> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('currencies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  static async softDeleteCurrency(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('currencies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
      
    if (error) throw error;
  }
}
