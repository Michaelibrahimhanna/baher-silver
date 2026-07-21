import { createClient } from '@/lib/supabase/client';

export class StockService {
  static async getAvailableStock(materialId: string, warehouseId: string): Promise<number> {
    const supabase = createClient();
    
    // Simplification: In a full ERP, Available = OnHand - Reserved
    // Here we just fetch the latest running balance for this material in this warehouse.
    const { data, error } = await supabase
      .from('stock_ledger')
      .select('running_balance')
      .eq('material_id', materialId)
      .eq('warehouse_id', warehouseId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error;
    return data ? Number(data.running_balance) : 0;
  }

  static async getReservedStock(materialId: string, warehouseId: string): Promise<number> {
    void materialId;
    void warehouseId;
    // This would query pending transfers, reserved allocations for manufacturing orders, etc.
    return 0;
  }

  static async getOnHandStock(materialId: string, warehouseId: string): Promise<number> {
    return this.getAvailableStock(materialId, warehouseId);
  }

  static async getIncomingStock(materialId: string, warehouseId: string): Promise<number> {
    void materialId;
    void warehouseId;
    // Query pending POs destined for this warehouse
    return 0;
  }
}
