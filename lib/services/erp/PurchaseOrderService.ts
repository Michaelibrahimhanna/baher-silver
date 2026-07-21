import { createClient } from '@/lib/supabase/client';
import type { PurchaseOrder, PurchaseOrderItem } from '@/types/erp';

export class PurchaseOrderService {
  static async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(*), currency:currencies(*)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  }

  static async getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(*), currency:currencies(*), items:purchase_order_items(*, material:materials(*), unit:measurement_units(*))')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async createPurchaseOrder(po: Partial<PurchaseOrder>, items: Partial<PurchaseOrderItem>[]): Promise<PurchaseOrder> {
    const supabase = createClient();
    
    // Using an RPC or a transaction is better, but since Supabase JS client doesn't support transactions directly out of the box without RPC, we'll do it sequentially for now
    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .insert([po])
      .select()
      .single();
      
    if (orderError) throw orderError;
    
    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({ ...item, purchase_order_id: order.id }));
      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsToInsert);
        
      if (itemsError) {
        // Simple rollback mechanism
        await supabase.from('purchase_orders').delete().eq('id', order.id);
        throw itemsError;
      }
    }
    
    return this.getPurchaseOrderById(order.id) as Promise<PurchaseOrder>;
  }

  static async updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('purchase_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  static async softDeletePurchaseOrder(id: string): Promise<void> {
    const supabase = createClient();
    
    // Soft delete PO
    const { error: poError } = await supabase
      .from('purchase_orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
      
    if (poError) throw poError;
    
    // Soft delete items
    await supabase
      .from('purchase_order_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('purchase_order_id', id);
  }
}
