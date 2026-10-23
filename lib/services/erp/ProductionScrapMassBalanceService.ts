import { createClient } from '@/lib/supabase/client';
import type { MassBalanceResult, MassBalanceStatus } from '@/types/erp';

export class ProductionScrapMassBalanceService {
  /**
   * Verified Silver Refining Recovery Efficiency: 95.0%
   */
  static readonly RECOVERY_EFFICIENCY = 0.95;

  /**
   * Industrial Mass Balance Tolerance: 0.5000g
   */
  static readonly TOLERANCE_GRAMS = 0.5;

  /**
   * Decoupled Authoritative Metallurgical Mass Balance Solver
   *
   * Formula:
   *   variance = input_weight - (finished_goods_weight + total_scrap_weight + expected_process_loss)
   *
   * Invariant:
   *   |variance| <= 0.5000g -> BALANCED
   *   |variance| >  0.5000g -> VARIANCE_BLOCKED
   *
   * The formula CANNOT mathematically force variance to zero.
   */
  static async calculateMassBalance(
    orderId: string,
    supabaseClient?: any
  ): Promise<MassBalanceResult> {
    const supabase = supabaseClient || createClient();

    // 1. Fetch Order Metadata and Snapshot
    const { data: order, error: orderErr } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      throw new Error(`404 Not Found: Production Order #${orderId} does not exist.`);
    }

    // 2. Fetch Verified BOM Snapshot to extract expected waste factor
    const { data: snapshot } = await supabase
      .from('production_order_bom_snapshots')
      .select('*')
      .eq('order_id', orderId)
      .single();

    let wasteFactorPct = 3.0; // Default 3.0% silver waste standard if snapshot absent
    if (snapshot && snapshot.snapshot_data) {
      const lines = Array.isArray(snapshot.snapshot_data)
        ? snapshot.snapshot_data
        : snapshot.snapshot_data.lines || [];
      const silverLine = lines.find((l: any) => l.line_type === 'SILVER');
      if (silverLine && silverLine.waste_factor_pct !== undefined) {
        wasteFactorPct = Number(silverLine.waste_factor_pct);
      }
    }

    // 3. Fetch Scrap Entries
    const { data: scrapEntries } = await supabase
      .from('production_scrap_ledger')
      .select('*')
      .eq('order_id', orderId);

    const scrapByCategory: Record<string, number> = {};
    let totalScrapWeight = 0.0;
    let totalRecoveredSilver = 0.0;

    (scrapEntries || []).forEach((s: any) => {
      const weight = Number(s.weight_grams || 0);
      const category = s.scrap_category || 'BENCH_FILINGS';
      scrapByCategory[category] = (scrapByCategory[category] || 0) + weight;
      totalScrapWeight += weight;
      totalRecoveredSilver += Number(s.recovered_pure_silver || 0);
    });

    // 4. Fetch Measured Scale Weights
    // Input silver weight = actual scale weight of silver grain issued to crucible
    const inputSilverWeight = Number(order.actual_silver_weight || order.estimated_silver_weight || 0.0);

    // Finished Goods Silver Weight = measured output weight of completed pieces
    let finishedGoodsWeight = 0.0;

    // Check Packaging WIP lot for measured scale weight
    const { data: packagingWip } = await supabase
      .from('production_order_wip_lots')
      .select('weight_grams, status')
      .eq('order_id', orderId)
      .eq('current_stage_code', 'PACKAGING')
      .single();

    if (packagingWip && Number(packagingWip.weight_grams) > 0) {
      finishedGoodsWeight = Number(packagingWip.weight_grams);
    } else if (order.finished_goods_weight !== undefined) {
      finishedGoodsWeight = Number(order.finished_goods_weight);
    }

    // 5. Calculate Expected Loss independently from BOM Snapshot
    // W_loss_expected = W_input * (waste_factor_pct / 100)
    const expectedLossGrams = parseFloat((inputSilverWeight * (wasteFactorPct / 100.0)).toFixed(4));

    // 6. Calculate Total Accounted Mass & Decoupled Variance
    // Total Accounted = Finished Goods + Recoverable Scrap + Expected Loss
    const totalAccountedGrams = parseFloat(
      (finishedGoodsWeight + totalScrapWeight + expectedLossGrams).toFixed(4)
    );

    // Variance = Input - Total Accounted
    const varianceGrams = parseFloat((inputSilverWeight - totalAccountedGrams).toFixed(4));

    // 7. Industrial Tolerance Gate
    const isBalanced = Math.abs(varianceGrams) <= this.TOLERANCE_GRAMS;
    let status: MassBalanceStatus = isBalanced ? 'BALANCED' : 'VARIANCE_BLOCKED';

    if (order.mass_balance_status === 'OVERRIDDEN') {
      status = 'OVERRIDDEN';
    }

    return {
      order_id: order.id,
      order_code: order.order_code,
      measured_input_silver_grams: inputSilverWeight,
      measured_finished_goods_silver_grams: finishedGoodsWeight,
      measured_scrap_silver_grams: totalScrapWeight,
      expected_loss_grams: expectedLossGrams,
      total_accounted_grams: totalAccountedGrams,
      variance_grams: varianceGrams,
      is_balanced: isBalanced,
      status,
      scrap_breakdown: scrapByCategory,
      recovered_pure_silver_grams: parseFloat(totalRecoveredSilver.toFixed(4))
    };
  }

  /**
   * Ad-hoc Workshop Scrap Recording
   */
  static async recordScrapEntry(
    input: {
      order_id: string;
      stage_code: string;
      scrap_type: string;
      weight_grams: number;
      purity_pct?: number;
      reason?: string;
      operator_id?: string;
      actor_id?: string;
    },
    supabaseClient?: any
  ): Promise<any> {
    const supabase = supabaseClient || createClient();

    if (!input.order_id || !input.stage_code || !input.scrap_type) {
      throw new Error('400 Bad Request: order_id, stage_code, and scrap_type are required.');
    }

    const weight = Number(input.weight_grams);
    if (isNaN(weight) || weight <= 0) {
      throw new Error('422 Unprocessable Entity: Scrap weight must be a positive number.');
    }

    const purity = Number(input.purity_pct || 92.5);
    const recoveredPureSilver = parseFloat((weight * (purity / 100) * this.RECOVERY_EFFICIENCY).toFixed(4));

    // 1. Insert into production_scrap_ledger
    const { data: scrapEntry, error: sErr } = await supabase
      .from('production_scrap_ledger')
      .insert([
        {
          order_id: input.order_id,
          stage_code: input.stage_code,
          scrap_type: input.scrap_type,
          weight_grams: weight,
          silver_purity_pct: purity,
          recovered_pure_silver: recoveredPureSilver,
          reason: input.reason || 'WORKSHOP_BENCH_RECOVERY',
          operator_id: input.operator_id || input.actor_id || null
        }
      ])
      .select()
      .single();

    if (sErr) throw sErr;

    // 2. Append to production_order_timeline
    await supabase.from('production_order_timeline').insert([
      {
        order_id: input.order_id,
        event_type: 'SCRAP_RECORDED',
        actor_id: input.actor_id || null,
        metadata: {
          scrap_id: scrapEntry?.id,
          scrap_type: input.scrap_type,
          stage_code: input.stage_code,
          weight_grams: weight,
          recovered_pure_silver: recoveredPureSilver
        }
      }
    ]);

    return scrapEntry;
  }
}
