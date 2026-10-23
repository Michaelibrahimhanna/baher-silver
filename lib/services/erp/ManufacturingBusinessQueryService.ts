import { createClient } from '@/lib/supabase/client';
import { ProductionOrderPlanningService } from './ProductionOrderPlanningService';
import { BOMSnapshotService } from './BOMSnapshotService';
import { MaterialRequirementsEngine } from './MaterialRequirementsEngine';
import type { WarehouseReadinessReport } from '@/types/erp';

export interface GroundedManufacturingEnvelope<T> {
  source: 'canonical_database';
  verified: boolean;
  generated_at: string;
  query_type: string;
  data: T;
  evidence: {
    record_count: number;
    source_tables: string[];
  };
}

export class ManufacturingBusinessQueryService {
  /**
   * 1. Query Production Order Details (Read-Only)
   */
  static async queryOrderDetails(
    orderId: string,
    supabaseClient?: ReturnType<typeof createClient>
  ): Promise<GroundedManufacturingEnvelope<any>> {
    const supabase = supabaseClient || createClient();

    const { data: order, error } = await supabase
      .from('production_orders')
      .select('*, product:products(name_ar, name_en), variant:product_variants(sku, weight)')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw new Error(`Production Order #${orderId} not found.`);
    }

    return {
      source: 'canonical_database',
      verified: true,
      generated_at: new Date().toISOString(),
      query_type: 'ORDER_DETAILS_QUERY',
      data: order,
      evidence: {
        record_count: 1,
        source_tables: ['production_orders', 'products', 'product_variants']
      }
    };
  }

  /**
   * 2. Query Authoritative BOM (Snapshot if Confirmed, Master if Planned)
   */
  static async queryOrderBOM(
    orderId: string,
    supabaseClient?: ReturnType<typeof createClient>
  ): Promise<GroundedManufacturingEnvelope<any>> {
    const supabase = supabaseClient || createClient();

    const { data: order } = await supabase
      .from('production_orders')
      .select('id, variant_id, bom_id, bom_version, bom_snapshot_id, target_date, status')
      .eq('id', orderId)
      .single();

    if (!order) throw new Error(`Order #${orderId} not found.`);

    if (order.bom_snapshot_id) {
      const snapshot = await BOMSnapshotService.getSnapshotByOrderId(order.id, supabase);
      return {
        source: 'canonical_database',
        verified: true,
        generated_at: new Date().toISOString(),
        query_type: 'FROZEN_BOM_SNAPSHOT_QUERY',
        data: {
          is_snapshot: true,
          bom_id: snapshot.bom_id,
          bom_version: snapshot.bom_version,
          snapshot_hash: snapshot.snapshot_hash,
          lines: snapshot.snapshot_data
        },
        evidence: {
          record_count: snapshot.snapshot_data.length,
          source_tables: ['production_order_bom_snapshots']
        }
      };
    }

    const targetDate = order.target_date || new Date().toISOString().split('T')[0];
    const { bom, lines } = await ProductionOrderPlanningService.resolveApprovedBOM(
      order.variant_id,
      targetDate,
      supabase
    );

    return {
      source: 'canonical_database',
      verified: true,
      generated_at: new Date().toISOString(),
      query_type: 'ACTIVE_MASTER_BOM_QUERY',
      data: {
        is_snapshot: false,
        bom_id: bom.id,
        bom_version: bom.version,
        lines
      },
      evidence: {
        record_count: lines.length,
        source_tables: ['boms', 'bom_items']
      }
    };
  }

  /**
   * 3. Query Pure Material Requirements
   */
  static async queryOrderRequirements(
    orderId: string,
    supabaseClient?: ReturnType<typeof createClient>
  ): Promise<GroundedManufacturingEnvelope<any>> {
    const supabase = supabaseClient || createClient();

    const { data: order } = await supabase
      .from('production_orders')
      .select('id, planned_quantity, variant_id, target_date, bom_snapshot_id')
      .eq('id', orderId)
      .single();

    if (!order) throw new Error(`Order #${orderId} not found.`);

    let lines;
    if (order.bom_snapshot_id) {
      const snap = await BOMSnapshotService.getSnapshotByOrderId(order.id, supabase);
      lines = snap.snapshot_data;
    } else {
      const targetDate = order.target_date || new Date().toISOString().split('T')[0];
      const res = await ProductionOrderPlanningService.resolveApprovedBOM(order.variant_id, targetDate, supabase);
      lines = res.lines;
    }

    const requirements = MaterialRequirementsEngine.calculateRequirements(order.planned_quantity, lines);

    return {
      source: 'canonical_database',
      verified: true,
      generated_at: new Date().toISOString(),
      query_type: 'MATERIAL_REQUIREMENTS_QUERY',
      data: {
        planned_quantity: order.planned_quantity,
        requirements
      },
      evidence: {
        record_count: requirements.length,
        source_tables: ['production_orders', 'boms', 'bom_items']
      }
    };
  }

  /**
   * 4. Query Warehouse Readiness Report
   */
  static async queryOrderReadiness(
    orderId: string,
    supabaseClient?: ReturnType<typeof createClient>
  ): Promise<GroundedManufacturingEnvelope<WarehouseReadinessReport>> {
    const report = await ProductionOrderPlanningService.getReadinessReport(orderId, supabaseClient);

    return {
      source: 'canonical_database',
      verified: true,
      generated_at: new Date().toISOString(),
      query_type: 'WAREHOUSE_READINESS_QUERY',
      data: report,
      evidence: {
        record_count: report.lines.length,
        source_tables: [
          'production_orders',
          'inventory_batches',
          'gemstone_lots',
          'production_material_allocations'
        ]
      }
    };
  }

  /**
   * 5. Query Missing Materials Only
   */
  static async queryMissingMaterials(
    orderId: string,
    supabaseClient?: ReturnType<typeof createClient>
  ): Promise<GroundedManufacturingEnvelope<any>> {
    const report = await ProductionOrderPlanningService.getReadinessReport(orderId, supabaseClient);
    const missingLines = report.lines.filter((l) => l.status === 'SHORTAGE');

    return {
      source: 'canonical_database',
      verified: true,
      generated_at: new Date().toISOString(),
      query_type: 'MISSING_MATERIALS_QUERY',
      data: {
        order_id: report.order_id,
        order_code: report.order_code,
        overall_status: report.overall_status,
        missing_count: missingLines.length,
        missing_items: missingLines.map((l) => ({
          item_code: l.item_code,
          item_name: l.item_name,
          line_type: l.line_type,
          gross_required: l.gross_required_quantity,
          net_available: l.net_available_quantity,
          shortage: l.shortage_quantity,
          unit: l.unit_of_measure
        }))
      },
      evidence: {
        record_count: missingLines.length,
        source_tables: ['inventory_batches', 'gemstone_lots', 'production_material_allocations']
      }
    };
  }
}
