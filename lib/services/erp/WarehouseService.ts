import { createClient } from '@/lib/supabase/client';
import type { Warehouse, WarehouseType } from '@/types/erp';
import { eventDispatcher } from '@/lib/events/EventDispatcher';

export class WarehouseService {
  static async getWarehouses(): Promise<Warehouse[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('warehouses')
      .select('*, type:warehouse_types(*)')
      .is('deleted_at', null)
      .order('name');
      
    if (error) throw error;
    return data || [];
  }

  static async getWarehouseTypes(): Promise<WarehouseType[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('warehouse_types')
      .select('*')
      .is('is_active', true)
      .order('sort_order');
      
    if (error) throw error;
    return data || [];
  }

  static async createWarehouse(warehouse: Partial<Warehouse>): Promise<Warehouse> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('warehouses')
      .insert([warehouse])
      .select()
      .single();
      
    if (error) throw error;
    
    // Publish Domain Event
    eventDispatcher.publish({
      event_id: crypto.randomUUID(),
      event_name: 'WarehouseCreated',
      version: 1,
      occurred_at: new Date().toISOString(),
      entity_id: data.id,
      payload: data
    });

    return data;
  }
}
