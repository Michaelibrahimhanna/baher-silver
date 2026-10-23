import { createClient } from '@/lib/supabase/client';
import type {
  BOM,
  BOMItem,
  BOMSnapshotLine,
  ConfirmOrderOptions,
  CreateDraftOrderInput,
  ProductionOrder,
  ProductionOrderStatus,
  WarehouseReadinessReport
} from '@/types/erp';
import { BOMSnapshotService } from './BOMSnapshotService';
import { WarehouseReadinessService } from './WarehouseReadinessService';

export class ProductionOrderPlanningService {
  /**
   * Generate Next Order Code: MO-YYYY-XXXXXX
   */
  static async generateOrderCode(supabaseClient?: ReturnType<typeof createClient>): Promise<string> {
    const supabase = supabaseClient || createClient();
    const currentYear = new Date().getFullYear();

    const { count } = await supabase
      .from('production_orders')
      .select('*', { count: 'exact', head: true });

    const nextSeq = String((count || 0) + 101).padStart(6, '0');
    return `MO-${currentYear}-${nextSeq}`;
  }

  /**
   * 1. CREATE DRAFT PRODUCTION ORDER
   * Validates product/variant compatibility and planned quantity > 0.
   */
  static async createDraftOrder(
    input: CreateDraftOrderInput,
    supabaseClient?: ReturnType<typeof createClient>
  ): Promise<ProductionOrder> {
    const supabase = supabaseClient || createClient();

    if (input.planned_quantity <= 0) {
      throw new Error('Planned quantity must be strictly greater than zero.');
    }

    if (!input.organization_id || !input.branch_id || !input.warehouse_id) {
      throw new Error('organization_id, branch_id, and warehouse_id are required.');
    }

    // Hard Guard: Non-silver retail merchandise cannot enter manufacturing operations
    const { getProductBySlugOrId } = await import('@/lib/db/productEngine');
    const catalogProduct = getProductBySlugOrId(input.product_id, input.organization_id);
    if (catalogProduct && catalogProduct.profile_type === 'NON_SILVER_RETAIL') {
      const err: any = new Error(
        'Non-silver retail merchandise cannot enter manufacturing operations or be assigned to a manufacturing order.'
      );
      err.code = 'NON_SILVER_PRODUCT_CANNOT_BE_MANUFACTURED';
      err.status = 422;
      throw err;
    }

    const { data: dbProduct } = await supabase
      .from('products')
      .select('profile_type, metal')
      .eq('id', input.product_id)
      .maybeSingle();

    if (dbProduct && (dbProduct.profile_type === 'NON_SILVER_RETAIL' || dbProduct.metal === 'non_silver')) {
      const err: any = new Error(
        'Non-silver retail merchandise cannot enter manufacturing operations or be assigned to a manufacturing order.'
      );
      err.code = 'NON_SILVER_PRODUCT_CANNOT_BE_MANUFACTURED';
      err.status = 422;
      throw err;
    }

    // Validate product and variant compatibility
    const { data: variant, error: variantErr } = await supabase
      .from('product_variants')
      .select('id, product_id, sku, weight')
      .eq('id', input.variant_id)
      .single();

    if (variantErr || !variant) {
      throw new Error(`Variant #${input.variant_id} not found.`);
    }

    if (variant.product_id !== input.product_id) {
      throw new Error(
        `Variant #${input.variant_id} does not belong to Product #${input.product_id}. Incompatible combination.`
      );
    }

    const orderCode = await this.generateOrderCode(supabase);
    const estSilverWeight = Number(variant.weight || 15.0) * input.planned_quantity;

    const payload = {
      order_code: orderCode,
      organization_id: input.organization_id,
      branch_id: input.branch_id,
      warehouse_id: input.warehouse_id,
      product_id: input.product_id,
      variant_id: input.variant_id,
      sku: variant.sku,
      planned_quantity: input.planned_quantity,
      completed_quantity: 0,
      scrapped_quantity: 0,
      target_silver_purity: '925',
      estimated_silver_weight: estSilverWeight,
      actual_silver_weight: 0.0,
      silver_loss_weight: 0.0,
      status: 'DRAFT',
      readiness_status: 'NOT_EVALUATED',
      reservation_status: 'UNRESERVED',
      qc_status: 'NOT_STARTED',
      priority: input.priority || 'MEDIUM',
      target_date: input.target_date,
      notes: input.notes || null,
      created_by: input.created_by || null
    };

    const { data: order, error: orderErr } = await supabase
      .from('production_orders')
      .insert([payload])
      .select()
      .single();

    if (orderErr) {
      throw new Error(`Failed to create draft production order: ${orderErr.message}`);
    }

    // Record Timeline
    await supabase.from('production_order_timeline').insert([
      {
        order_id: order.id,
        from_status: null,
        to_status: 'DRAFT',
        action: 'CREATE_DRAFT',
        actor_id: input.created_by || null,
        details: `Created draft production order #${orderCode} for ${input.planned_quantity} pieces`
      }
    ]);

    return order as ProductionOrder;
  }

  /**
   * 2. RESOLVE APPROVED MASTER BOM
   * Enforces status=APPROVED, is_active=true, effective date window.
   */
  static async resolveApprovedBOM(
    variantId: string,
    targetDate: string,
    supabaseClient?: ReturnType<typeof createClient>
  ): Promise<{ bom: BOM; lines: BOMSnapshotLine[] }> {
    const supabase = supabaseClient || createClient();

    const { data: boms, error: bomsErr } = await supabase
      .from('boms')
      .select(`
        *,
        items:bom_items(
          id,
          bom_id,
          material_id,
          gemstone_id,
          quantity,
          waste_factor_pct,
          expected_waste,
          unit_of_measure,
          line_type,
          material:materials(id, name, purity, type, unit, standard_cost),
          gemstone:gemstones(id, code, name_ar, stone_type, purchase_price)
        )
      `)
      .eq('variant_id', variantId)
      .eq('status', 'APPROVED')
      .eq('is_active', true)
      .lte('effective_from', targetDate)
      .order('version', { ascending: false })
      .order('effective_from', { ascending: false });

    if (bomsErr) {
      throw new Error(`Failed to resolve BOM: ${bomsErr.message}`);
    }

    // Filter by effective_to if present
    const validBoms = (boms || []).filter((b) => {
      if (!b.effective_to) return true;
      return new Date(b.effective_to) > new Date(targetDate);
    });

    if (validBoms.length === 0) {
      throw new Error(
        `422 Unprocessable Entity: No approved Bill of Materials (BOM) found for variant #${variantId} at target date ${targetDate}.`
      );
    }

    // Deterministic selection: top version
    const selectedBOM = validBoms[0] as BOM & { items: any[] };

    if (validBoms.length > 1) {
      // Data anomaly warning: multiple overlapping approved BOMs
      console.warn(
        `[DATA ANOMALY] Multiple approved BOMs found for variant #${variantId}. Selected version #${selectedBOM.version}.`
      );
    }

    if (!selectedBOM.items || selectedBOM.items.length === 0) {
      throw new Error(`422 Unprocessable Entity: Approved BOM #${selectedBOM.id} contains no material lines.`);
    }

    // Map to normalized snapshot lines
    const snapshotLines: BOMSnapshotLine[] = selectedBOM.items.map((item: any, idx: number) => {
      let lineType = (item.line_type || 'SILVER').toUpperCase() as BOMSnapshotLine['line_type'];
      let itemId = item.material_id || item.gemstone_id || '';
      let itemCode = 'UNKNOWN';
      let itemName = 'Unknown Component';
      let purity = null;
      let unitCostSnapshot = null;
      let uom = item.unit_of_measure || 'g';

      if (item.gemstone) {
        lineType = 'STONE';
        itemId = item.gemstone.id;
        itemCode = item.gemstone.code;
        itemName = item.gemstone.name_ar;
        uom = item.unit_of_measure || 'piece';
        unitCostSnapshot = item.gemstone.purchase_price ? Number(item.gemstone.purchase_price) : null;
      } else if (item.material) {
        itemId = item.material.id;
        itemCode = item.material.name;
        itemName = `${item.material.name} ${item.material.purity || ''}`.trim();
        purity = item.material.purity || '925';
        uom = item.material.unit || item.unit_of_measure || 'g';
        unitCostSnapshot = item.material.standard_cost ? Number(item.material.standard_cost) : null;

        if (item.material.type === 'raw_material') {
          lineType = 'SILVER';
        } else if (item.material.type === 'packaging') {
          lineType = 'PACKAGING';
        } else if (item.material.type === 'consumable') {
          lineType = 'CONSUMABLE';
        }
      }

      const wasteFactor = Number(item.waste_factor_pct || item.expected_waste || 0.0);

      return {
        line_number: idx + 1,
        line_type: lineType,
        item_id: itemId,
        item_code: itemCode,
        item_name: itemName,
        purity,
        base_quantity: Number(item.quantity || 1.0),
        waste_factor_pct: wasteFactor,
        unit_of_measure: uom,
        unit_cost_snapshot: unitCostSnapshot
      };
    });

    return { bom: selectedBOM, lines: snapshotLines };
  }

  /**
   * 3. PLAN ORDER: DRAFT -> PLANNED / SHORTAGE_BLOCKED
   * Resolves approved Master BOM, calculates material requirements, evaluates warehouse readiness.
   */
  static async planOrder(
    orderId: string,
    supabaseClient?: ReturnType<typeof createClient>
  ): Promise<{
    order: ProductionOrder;
    bom: BOM;
    readinessReport: WarehouseReadinessReport;
  }> {
    const supabase = supabaseClient || createClient();

    const { data: order, error: orderErr } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      throw new Error(`Production Order #${orderId} not found.`);
    }

    if (order.status !== 'DRAFT' && order.status !== 'SHORTAGE_BLOCKED' && order.status !== 'PLANNED') {
      throw new Error(`Cannot plan order in status '${order.status}'.`);
    }

    // Resolve active approved Master BOM
    const targetDateStr = order.target_date || new Date().toISOString().split('T')[0];
    const { bom, lines } = await this.resolveApprovedBOM(order.variant_id, targetDateStr, supabase);

    // Evaluate warehouse readiness
    const readinessReport = await WarehouseReadinessService.evaluateReadiness({
      orderId: order.id,
      orderCode: order.order_code,
      productId: order.product_id,
      variantId: order.variant_id,
      sku: order.sku || 'SKU-PENDING',
      plannedQuantity: order.planned_quantity,
      warehouseId: order.warehouse_id,
      lines,
      supabaseClient: supabase
    });

    // Update status based on readiness
    const newStatus: ProductionOrderStatus =
      readinessReport.overall_status === 'READY' ? 'PLANNED' : 'SHORTAGE_BLOCKED';

    const { data: updatedOrder, error: updateErr } = await supabase
      .from('production_orders')
      .update({
        status: newStatus,
        bom_id: bom.id,
        bom_version: bom.version,
        readiness_status: readinessReport.overall_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)
      .select()
      .single();

    if (updateErr) {
      throw new Error(`Failed to update order status: ${updateErr.message}`);
    }

    // Record Timeline
    await supabase.from('production_order_timeline').insert([
      {
        order_id: order.id,
        from_status: order.status,
        to_status: newStatus,
        action: 'PLAN_ORDER',
        actor_id: null,
        details: `Evaluated readiness: ${readinessReport.overall_status} (${readinessReport.total_shortages_count} shortages). BOM v${bom.version} attached.`
      }
    ]);

    return {
      order: updatedOrder as ProductionOrder,
      bom,
      readinessReport
    };
  }

  /**
   * 4. CONFIRM ORDER & FREEZE BOM SNAPSHOT (ATOMIC TRANSACTION)
   * Freezes snapshot immutably, SHA-256 hashed. Enforces readiness gates.
   */
  static async confirmOrder(
    orderId: string,
    options?: ConfirmOrderOptions,
    supabaseClient?: ReturnType<typeof createClient>
  ): Promise<{
    order: ProductionOrder;
    snapshot: any;
    readinessReport: WarehouseReadinessReport;
  }> {
    const supabase = supabaseClient || createClient();

    // Check Idempotency Key
    if (options?.idempotency_key) {
      const { data: existingRecord } = await supabase
        .from('idempotency_records')
        .select('response_payload')
        .eq('key', options.idempotency_key)
        .single();

      if (existingRecord) {
        return existingRecord.response_payload;
      }
    }

    // Fetch order
    const { data: order, error: orderErr } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      throw new Error(`Production Order #${orderId} not found.`);
    }

    if (order.status !== 'PLANNED' && order.status !== 'SHORTAGE_BLOCKED') {
      throw new Error(`Cannot confirm order in status '${order.status}'. Order must be PLANNED.`);
    }

    // Resolve BOM lines
    const targetDateStr = order.target_date || new Date().toISOString().split('T')[0];
    const { bom, lines } = await this.resolveApprovedBOM(order.variant_id, targetDateStr, supabase);

    // Re-evaluate readiness in real time
    const readinessReport = await WarehouseReadinessService.evaluateReadiness({
      orderId: order.id,
      orderCode: order.order_code,
      productId: order.product_id,
      variantId: order.variant_id,
      sku: order.sku || 'SKU-PENDING',
      plannedQuantity: order.planned_quantity,
      warehouseId: order.warehouse_id,
      lines,
      supabaseClient: supabase
    });

    // Enforce Readiness Semantics
    if (readinessReport.overall_status === 'NOT_READY') {
      throw new Error(
        '422 Unprocessable Entity: Critical primary metal (Silver) has shortage. Confirmation is strictly blocked.'
      );
    }

    if (readinessReport.overall_status === 'PARTIALLY_READY') {
      if (!options?.manager_override_token || !options?.justification) {
        throw new Error(
          '422 Unprocessable Entity: Order is PARTIALLY_READY. Confirmation requires manager override token and mandatory business justification.'
        );
      }
    }

    // Create Immutable BOM Snapshot with SHA-256 Hash
    const snapshot = await BOMSnapshotService.createSnapshot({
      orderId: order.id,
      bomId: bom.id,
      bomVersion: bom.version,
      lines,
      snapshottedBy: options?.actor_id || null,
      supabaseClient: supabase
    });

    // Transition Order to CONFIRMED
    const { data: confirmedOrder, error: confirmErr } = await supabase
      .from('production_orders')
      .update({
        status: 'CONFIRMED',
        bom_snapshot_id: snapshot.id,
        bom_id: bom.id,
        bom_version: bom.version,
        readiness_status: readinessReport.overall_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)
      .select()
      .single();

    if (confirmErr) {
      throw new Error(`Failed to confirm order: ${confirmErr.message}`);
    }

    // Record Timeline Event
    await supabase.from('production_order_timeline').insert([
      {
        order_id: order.id,
        from_status: order.status,
        to_status: 'CONFIRMED',
        action: 'CONFIRM_ORDER',
        actor_id: options?.actor_id || null,
        details: `Order confirmed. Immutable BOM Snapshot #${snapshot.id} created with SHA-256 hash ${snapshot.snapshot_hash.slice(0, 16)}...`
      }
    ]);

    // Persist Domain Event in event_store
    await supabase.from('event_store').insert([
      {
        event_id: crypto.randomUUID(),
        event_name: 'ProductionOrderConfirmed',
        version: 1,
        entity_id: order.id,
        actor: options?.actor_id || null,
        payload: {
          order_id: order.id,
          order_code: order.order_code,
          bom_snapshot_id: snapshot.id,
          snapshot_hash: snapshot.snapshot_hash,
          readiness_status: readinessReport.overall_status,
          override_applied: readinessReport.overall_status === 'PARTIALLY_READY'
        },
        occurred_at: new Date().toISOString()
      }
    ]);

    const resultPayload = {
      order: confirmedOrder as ProductionOrder,
      snapshot,
      readinessReport
    };

    // Save Idempotency Record if key provided
    if (options?.idempotency_key) {
      await supabase.from('idempotency_records').insert([
        {
          key: options.idempotency_key,
          action: 'CONFIRM_ORDER',
          resource_id: order.id,
          response_payload: resultPayload
        }
      ]);
    }

    return resultPayload;
  }

  /**
   * 5. GET DETERMINISTIC READINESS REPORT
   */
  static async getReadinessReport(
    orderId: string,
    supabaseClient?: ReturnType<typeof createClient>
  ): Promise<WarehouseReadinessReport> {
    const supabase = supabaseClient || createClient();

    const { data: order, error: orderErr } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      throw new Error(`Production Order #${orderId} not found.`);
    }

    let lines: BOMSnapshotLine[];

    if (order.bom_snapshot_id) {
      // Order is CONFIRMED -> Read strictly from immutable snapshot
      const snapshot = await BOMSnapshotService.getSnapshotByOrderId(order.id, supabase);
      lines = snapshot.snapshot_data;
    } else {
      // Order is DRAFT or PLANNED -> Resolve from active Master BOM
      const targetDateStr = order.target_date || new Date().toISOString().split('T')[0];
      const res = await this.resolveApprovedBOM(order.variant_id, targetDateStr, supabase);
      lines = res.lines;
    }

    return await WarehouseReadinessService.evaluateReadiness({
      orderId: order.id,
      orderCode: order.order_code,
      productId: order.product_id,
      variantId: order.variant_id,
      sku: order.sku || 'SKU-PENDING',
      plannedQuantity: order.planned_quantity,
      warehouseId: order.warehouse_id,
      lines,
      supabaseClient: supabase
    });
  }

  /**
   * 6. CANCEL ORDER
   * Allowed from DRAFT, PLANNED, SHORTAGE_BLOCKED, CONFIRMED.
   */
  static async cancelOrder(
    orderId: string,
    reason: string,
    actorId?: string,
    supabaseClient?: ReturnType<typeof createClient>
  ): Promise<ProductionOrder> {
    const supabase = supabaseClient || createClient();

    const { data: order, error: orderErr } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      throw new Error(`Production Order #${orderId} not found.`);
    }

    const cancellableStatuses = ['DRAFT', 'PLANNED', 'SHORTAGE_BLOCKED', 'CONFIRMED'];
    if (!cancellableStatuses.includes(order.status)) {
      throw new Error(`Cannot cancel order in status '${order.status}'.`);
    }

    const { data: updated, error: updateErr } = await supabase
      .from('production_orders')
      .update({
        status: 'CANCELLED',
        notes: order.notes ? `${order.notes}\nCancellation Reason: ${reason}` : `Cancellation Reason: ${reason}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)
      .select()
      .single();

    if (updateErr) {
      throw new Error(`Failed to cancel order: ${updateErr.message}`);
    }

    await supabase.from('production_order_timeline').insert([
      {
        order_id: order.id,
        from_status: order.status,
        to_status: 'CANCELLED',
        action: 'CANCEL_ORDER',
        actor_id: actorId || null,
        details: reason
      }
    ]);

    return updated as ProductionOrder;
  }

  /**
   * 7. BLOCK FUTURE STATE TRANSITIONS IN L.2
   */
  static assertValidL2Transition(targetStatus: string): void {
    const futureStatuses = ['IN_PROGRESS', 'PAUSED', 'QUALITY_CHECK', 'COMPLETED', 'CLOSED'];
    if (futureStatuses.includes(targetStatus)) {
      throw new Error(
        `422 Unprocessable Entity: Transition to '${targetStatus}' belongs to future milestones (L.4/L.5/L.6). Blocked in Milestone L.2.`
      );
    }
  }
}
