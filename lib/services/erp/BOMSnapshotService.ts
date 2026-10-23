import crypto from 'node:crypto';
import { createClient } from '@/lib/supabase/client';
import type { BOMSnapshotLine, ProductionOrderBOMSnapshot } from '@/types/erp';

export class BOMSnapshotService {
  /**
   * Deterministic canonical serialization of BOM lines.
   * Ensures sorted lines by line_number and sorted object keys.
   */
  static serializeCanonicalBOM(lines: BOMSnapshotLine[]): string {
    const sortedLines = [...lines].sort((a, b) => a.line_number - b.line_number);

    const canonicalArray = sortedLines.map((line) => {
      return {
        base_quantity: Number(line.base_quantity),
        item_code: String(line.item_code).trim(),
        item_id: String(line.item_id),
        item_name: String(line.item_name).trim(),
        line_number: Number(line.line_number),
        line_type: line.line_type,
        purity: line.purity ? String(line.purity).trim() : null,
        unit_cost_snapshot: line.unit_cost_snapshot !== undefined && line.unit_cost_snapshot !== null
          ? Number(line.unit_cost_snapshot)
          : null,
        unit_of_measure: String(line.unit_of_measure).trim(),
        waste_factor_pct: Number(line.waste_factor_pct)
      };
    });

    return JSON.stringify(canonicalArray);
  }

  /**
   * Calculate SHA-256 Digest for an immutable BOM snapshot.
   * Format: SHA-256(order_id:bom_id:bom_version:canonical_json)
   */
  static calculateSnapshotHash(
    orderId: string,
    bomId: string,
    bomVersion: number,
    canonicalJson: string
  ): string {
    const preImage = `${orderId}:${bomId}:${bomVersion}:${canonicalJson}`;
    return crypto.createHash('sha256').update(preImage).digest('hex');
  }

  /**
   * Verify the cryptographic integrity of a loaded BOM Snapshot.
   * Returns true if hash matches; false if corrupted or tampered.
   */
  static verifySnapshotIntegrity(snapshot: ProductionOrderBOMSnapshot): boolean {
    if (!snapshot || !snapshot.snapshot_data || !snapshot.snapshot_hash) {
      return false;
    }

    const canonicalJson = this.serializeCanonicalBOM(snapshot.snapshot_data);
    const expectedHash = this.calculateSnapshotHash(
      snapshot.order_id,
      snapshot.bom_id,
      snapshot.bom_version,
      canonicalJson
    );

    return expectedHash === snapshot.snapshot_hash;
  }

  /**
   * Create and persist an immutable BOM Snapshot for a Production Order.
   */
  static async createSnapshot(params: {
    orderId: string;
    bomId: string;
    bomVersion: number;
    lines: BOMSnapshotLine[];
    snapshottedBy?: string | null;
    supabaseClient?: ReturnType<typeof createClient>;
  }): Promise<ProductionOrderBOMSnapshot> {
    const supabase = params.supabaseClient || createClient();

    if (!params.lines || params.lines.length === 0) {
      throw new Error('Cannot create BOM snapshot with empty lines.');
    }

    const canonicalJson = this.serializeCanonicalBOM(params.lines);
    const snapshotHash = this.calculateSnapshotHash(
      params.orderId,
      params.bomId,
      params.bomVersion,
      canonicalJson
    );

    const snapshotPayload = {
      order_id: params.orderId,
      bom_id: params.bomId,
      bom_version: params.bomVersion,
      snapshot_hash: snapshotHash,
      snapshot_data: JSON.parse(canonicalJson),
      snapshotted_by: params.snapshottedBy || null
    };

    const { data, error } = await supabase
      .from('production_order_bom_snapshots')
      .insert([snapshotPayload])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create BOM snapshot: ${error.message}`);
    }

    return data as ProductionOrderBOMSnapshot;
  }

  /**
   * Fetch snapshot by order ID and verify cryptographic integrity.
   * Fails closed if tampered.
   */
  static async getSnapshotByOrderId(
    orderId: string,
    supabaseClient?: ReturnType<typeof createClient>
  ): Promise<ProductionOrderBOMSnapshot> {
    const supabase = supabaseClient || createClient();

    const { data, error } = await supabase
      .from('production_order_bom_snapshots')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error || !data) {
      throw new Error(`BOM Snapshot not found for order #${orderId}`);
    }

    const snapshot = data as ProductionOrderBOMSnapshot;
    const isValid = this.verifySnapshotIntegrity(snapshot);

    if (!isValid) {
      throw new Error(
        `[CRITICAL INTEGRITY VIOLATION] BOM Snapshot hash mismatch for order #${orderId}. Halting execution.`
      );
    }

    return snapshot;
  }
}
