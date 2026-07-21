import { createClient } from '@/lib/supabase/client';
import { eventDispatcher } from '@/lib/events/EventDispatcher';
import type { InventoryTransaction, InventoryTransactionItem } from '@/types/erp';
import { FIFOCostStrategy } from './InventoryCostStrategy';
import { StockService } from './StockService';

export class InventoryService {
  static async processTransaction(transaction: Partial<InventoryTransaction>, items: Partial<InventoryTransactionItem>[]): Promise<InventoryTransaction> {
    const supabase = createClient();
    
    // 1. Validate Feature Flags
    const { data: settings } = await supabase.from('erp_settings').select('setting_value').eq('setting_key', 'allow_negative_stock').single();
    const allowNegativeStock = settings?.setting_value === 'true';

    // 2. Fetch Transaction Type
    const { data: type } = await supabase.from('inventory_transaction_types').select('code').eq('id', transaction.transaction_type_id).single();
    if (!type) throw new Error('Invalid transaction type');

    // For simplicity, we use FIFO cost strategy
    const costStrategy = new FIFOCostStrategy();

    // 3. Process Logic based on Type BEFORE Commit
    for (const item of items) {
      if (!item.material_id || !item.quantity || !transaction.warehouse_id) continue;

      if (type.code === 'goods_issue' || type.code === 'stock_adjustment') {
        // Validation for issues
        const available = await StockService.getAvailableStock(item.material_id, transaction.warehouse_id);
        if (!allowNegativeStock && available < item.quantity && type.code !== 'goods_receipt') {
          throw new Error(`Insufficient stock for material ${item.material_id}. Available: ${available}, Requested: ${item.quantity}`);
        }
        
        // Calculate Cost
        const { total_cost, consumed_batches } = await costStrategy.calculateIssueCost(item.material_id, transaction.warehouse_id, item.quantity);
        item.total_cost = total_cost;
        item.unit_cost = quantityToCost(total_cost, item.quantity);
        
        // Update Batches
        for (const consumed of consumed_batches) {
           void consumed;
           // We would execute batch depletion here (RPC or manual update)
           // supabase.rpc('deplete_inventory_batch', { batch_id: consumed.batch_id, qty: consumed.quantity })
        }
      }
    }

    // 4. Create Header
    const { data: header, error: headerError } = await supabase
      .from('inventory_transactions')
      .insert([{
        ...transaction,
        status_id: transaction.status_id // Assuming 'completed' status id is passed
      }])
      .select()
      .single();

    if (headerError) throw headerError;

    // 5. Create Items
    const itemsToInsert = items.map(i => ({ ...i, transaction_id: header.id }));
    const { data: createdItems, error: itemsError } = await supabase
      .from('inventory_transaction_items')
      .insert(itemsToInsert)
      .select();

    if (itemsError) throw itemsError;

    // 6. Write to Stock Ledger (simplified, ideally via DB trigger/RPC for atomic balance_after_transaction)
    // Note: To be perfectly safe, stock_ledger writes should happen in a Postgres function to prevent race conditions on balance_after_transaction.
    // We assume a trigger or RPC handles the ledger insert in a real system.

    // 7. Publish Event (afterCommit phase)
    eventDispatcher.publish({
      event_id: crypto.randomUUID(),
      event_name: this.mapTransactionTypeToEvent(type.code),
      version: 1,
      occurred_at: new Date().toISOString(),
      entity_id: header.id,
      payload: { header, items: createdItems }
    });

    return header;
  }

  private static mapTransactionTypeToEvent(code: string): string {
    switch (code) {
      case 'goods_receipt': return 'GoodsReceived';
      case 'goods_issue': return 'GoodsIssued';
      case 'stock_adjustment': return 'StockAdjusted';
      case 'physical_count': return 'PhysicalCountRecorded';
      default: return 'InventoryTransactionProcessed';
    }
  }
}

function quantityToCost(total: number, qty: number): number {
  return qty > 0 ? total / qty : 0;
}
