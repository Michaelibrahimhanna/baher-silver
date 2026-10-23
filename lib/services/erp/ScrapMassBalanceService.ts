import { createClient } from '@/lib/supabase/client';
import type { ProductionScrapLedger } from '@/types/erp';

export interface MassBalanceSummary {
  order_id: string;
  order_code: string;
  input_silver_weight_grams: number;
  finished_goods_weight_grams: number;
  total_scrap_weight_grams: number;
  recovered_pure_silver_grams: number;
  unrecoverable_loss_grams: number;
  mass_balance_variance_grams: number;
  is_balanced: boolean; // within 0.5g industrial tolerance
  scrap_by_category: Record<string, number>;
}

export class ScrapMassBalanceService {
  /**
   * Verified Silver Refining Recovery Efficiency: 95.0%
   */
  static readonly RECOVERY_EFFICIENCY = 0.95;

  /**
   * Record a categorized production scrap entry with automatic fine silver recovery calculation
   */
  static async recordScrap(params: {
    order_id: string;
    scrap_category:
      | 'CASTING_SPRUE'
      | 'BENCH_FILINGS'
      | 'POLISHING_DUST'
      | 'STONE_DAMAGE'
      | 'CHEMICAL_LOSS'
      | 'RECOVERED_SILVER';
    weight_grams: number;
    silver_purity?: string;
    recorded_by?: string;
    notes?: string;
  }): Promise<ProductionScrapLedger> {
    const supabase = createClient();

    const weight = Number(params.weight_grams || 0);
    const purityStr = params.silver_purity || '925';
    const purityFactor = (parseInt(purityStr, 10) || 925) / 1000.0;

    // Calculate recovered pure silver
    const recoveredPureSilver =
      params.scrap_category === 'RECOVERED_SILVER'
        ? weight
        : parseFloat((weight * purityFactor * this.RECOVERY_EFFICIENCY).toFixed(3));

    const { data, error } = await supabase
      .from('production_scrap_ledger')
      .insert([
        {
          order_id: params.order_id,
          scrap_category: params.scrap_category,
          weight_grams: weight,
          silver_purity: purityStr,
          recovered_pure_silver: recoveredPureSilver,
          recorded_by: params.recorded_by || null,
          notes: params.notes || null
        }
      ])
      .select()
      .single();

    if (error) throw new Error(`Failed to record scrap entry: ${error.message}`);

    // Update silver_loss_weight on production order
    const { data: order } = await supabase
      .from('production_orders')
      .select('silver_loss_weight')
      .eq('id', params.order_id)
      .single();

    if (order) {
      await supabase
        .from('production_orders')
        .update({
          silver_loss_weight: Number(order.silver_loss_weight || 0) + weight
        })
        .eq('id', params.order_id);
    }

    return data;
  }

  /**
   * Calculate complete Metallurgical Mass Balance for a Production Order
   * Formula: Input = Finished Pieces + Recoverable Scrap + Unrecoverable Loss
   */
  static async getMassBalanceSummary(orderId: string): Promise<MassBalanceSummary> {
    const supabase = createClient();

    const { data: order, error: orderErr } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) throw new Error(`Production Order #${orderId} not found`);

    const { data: scrapEntries } = await supabase
      .from('production_scrap_ledger')
      .select('*')
      .eq('order_id', orderId);

    const scrapByCategory: Record<string, number> = {};
    let totalScrapWeight = 0;
    let totalRecoveredSilver = 0;

    (scrapEntries || []).forEach((s) => {
      scrapByCategory[s.scrap_category] = (scrapByCategory[s.scrap_category] || 0) + Number(s.weight_grams);
      totalScrapWeight += Number(s.weight_grams);
      totalRecoveredSilver += Number(s.recovered_pure_silver);
    });

    const inputWeight = Number(order.estimated_silver_weight || order.actual_silver_weight || 0);
    const finishedWeight = Number(order.actual_silver_weight || 0);

    // Unrecoverable loss is input minus (finished + scrap)
    const accountedWeight = finishedWeight + totalScrapWeight;
    const unrecoverableLoss = Math.max(0, inputWeight - accountedWeight);
    const variance = parseFloat((inputWeight - accountedWeight - unrecoverableLoss).toFixed(3));

    return {
      order_id: order.id,
      order_code: order.order_code,
      input_silver_weight_grams: parseFloat(inputWeight.toFixed(3)),
      finished_goods_weight_grams: parseFloat(finishedWeight.toFixed(3)),
      total_scrap_weight_grams: parseFloat(totalScrapWeight.toFixed(3)),
      recovered_pure_silver_grams: parseFloat(totalRecoveredSilver.toFixed(3)),
      unrecoverable_loss_grams: parseFloat(unrecoverableLoss.toFixed(3)),
      mass_balance_variance_grams: variance,
      is_balanced: Math.abs(variance) <= 0.5, // 0.5g tolerance
      scrap_by_category: scrapByCategory
    };
  }
}
