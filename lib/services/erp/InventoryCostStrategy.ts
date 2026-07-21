import { createClient } from '@/lib/supabase/client';

export interface CostCalculationResult {
  unit_cost: number;
  total_cost: number;
  consumed_batches: Array<{ batch_id: string; quantity: number }>;
}

export interface InventoryCostStrategy {
  calculateIssueCost(materialId: string, warehouseId: string, quantity: number): Promise<CostCalculationResult>;
  calculateReceiptCost(materialId: string, quantity: number, totalCost: number): Promise<number>;
}

export class FIFOCostStrategy implements InventoryCostStrategy {
  async calculateIssueCost(materialId: string, warehouseId: string, quantity: number): Promise<CostCalculationResult> {
    const supabase = createClient();
    
    // Fetch available batches ordered by receipt_date ascending (FIFO)
    const { data: batches, error } = await supabase
      .from('inventory_batches')
      .select('*')
      .eq('material_id', materialId)
      .eq('warehouse_id', warehouseId)
      .gt('remaining_quantity', 0)
      .order('receipt_date', { ascending: true });
      
    if (error) throw error;
    
    let remainingToConsume = quantity;
    let totalCalculatedCost = 0;
    const consumed_batches = [];
    
    for (const batch of (batches || [])) {
      if (remainingToConsume <= 0) break;
      
      const qtyFromBatch = Math.min(Number(batch.remaining_quantity), remainingToConsume);
      totalCalculatedCost += qtyFromBatch * Number(batch.unit_cost);
      remainingToConsume -= qtyFromBatch;
      
      consumed_batches.push({ batch_id: batch.id, quantity: qtyFromBatch });
    }
    
    if (remainingToConsume > 0) {
      // If we don't have enough stock but allow_negative_stock is true, 
      // we might just use the latest known cost or 0. For strict FIFO, this is an issue.
      // We'll assume the last batch's unit cost for the remainder.
      const lastCost = batches && batches.length > 0 ? Number(batches[batches.length - 1].unit_cost) : 0;
      totalCalculatedCost += remainingToConsume * lastCost;
    }
    
    return {
      unit_cost: quantity > 0 ? totalCalculatedCost / quantity : 0,
      total_cost: totalCalculatedCost,
      consumed_batches
    };
  }

  async calculateReceiptCost(materialId: string, quantity: number, totalCost: number): Promise<number> {
    // FIFO doesn't inherently change a global average, it just records the incoming cost.
    // However, if we need to update the material's 'average_cost' field for reference, we would do a WAC calculation here anyway.
    return quantity > 0 ? totalCost / quantity : 0;
  }
}

export class WeightedAverageCostStrategy implements InventoryCostStrategy {
  async calculateIssueCost(materialId: string, warehouseId: string, quantity: number): Promise<CostCalculationResult> {
    const supabase = createClient();
    // Fetch current WAC from material
    const { data, error } = await supabase
      .from('materials')
      .select('average_cost')
      .eq('id', materialId)
      .single();
      
    if (error) throw error;
    
    const unitCost = Number(data?.average_cost || 0);
    return {
      unit_cost: unitCost,
      total_cost: unitCost * quantity,
      consumed_batches: [] // WAC doesn't consume specific batches
    };
  }

  async calculateReceiptCost(materialId: string, receiptQty: number, receiptTotalCost: number): Promise<number> {
    const supabase = createClient();
    
    // 1. Get current stock globally or per warehouse
    // For simplicity, we assume global WAC here.
    const { data: material } = await supabase
      .from('materials')
      .select('average_cost')
      .eq('id', materialId)
      .single();
      
    // 2. Get current total quantity from stock ledger
    const { data: ledger } = await supabase
      .from('stock_ledger')
      .select('balance_after_transaction')
      .eq('material_id', materialId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    const currentQty = ledger ? Number((ledger as { balance_after_transaction: number }).balance_after_transaction || 0) : 0;
    const currentCost = Number(material?.average_cost || 0);
    
    const currentTotalValue = currentQty * currentCost;
    const newTotalValue = currentTotalValue + receiptTotalCost;
    const newTotalQty = currentQty + receiptQty;
    
    const newWac = newTotalQty > 0 ? newTotalValue / newTotalQty : 0;
    
    // Update Material
    await supabase.from('materials').update({ average_cost: newWac }).eq('id', materialId);
    
    return newWac;
  }
}
