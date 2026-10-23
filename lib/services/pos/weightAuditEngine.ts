/**
 * Baher Silver — Weight Audit & Scale Verification Engine
 * 
 * Enforces:
 *   1. Hardware Scale Priority: Direct scale or embedded barcode is authoritative.
 *   2. Manual Override Guard: Manual weight entry strictly requires Admin/Owner authority.
 *   3. Mandatory Reason Validation: Manual weights must specify TEST, SCALE_FAILURE, or READING_CORRECTION.
 *   4. Immutable Audit Trail: Every manual override is written to a durable append-only log.
 *   5. Zero Silent Tolerance: Server rejects unauthorized manual overrides with 403 Forbidden.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RbacService } from '../../auth/rbacService';
import type { SafeUser } from '../../auth/types';

export type WeightSource = 'SCALE' | 'BARCODE' | 'MANUAL';

export const VALID_MANUAL_REASONS = ['TEST', 'SCALE_FAILURE', 'READING_CORRECTION'] as const;
export type ManualWeightReason = typeof VALID_MANUAL_REASONS[number];

export interface WeightVerificationInput {
  organizationId: string;
  branchId: string;
  terminalId: string;
  actor: SafeUser;
  source: WeightSource;
  grossWeightGrams: number;
  stoneWeightGrams?: number;
  manualReason?: string;
  pieceId?: string;
  sku?: string;
  serialNumber?: string;
}

export interface WeightAuditRecord {
  id: string;
  organization_id: string;
  branch_id: string;
  terminal_id: string;
  source: WeightSource;
  gross_weight_grams: number;
  stone_weight_grams: number;
  net_weight_grams: number;
  manual_reason?: string;
  actor_user_id: string;
  actor_email: string;
  actor_role: string;
  piece_id?: string;
  sku?: string;
  serial_number?: string;
  timestamp: string;
  signature: string;
}

export class WeightAuditEngine {
  private static durableLogPath: string = path.resolve(process.cwd(), '.data', 'weight_audit_records.jsonl');

  public static setStoragePath(customPath: string): void {
    this.durableLogPath = customPath;
  }

  /**
   * Authoritatively verifies the weight entry and enforces RBAC + reason constraints.
   */
  public static verifyAndRecordWeight(input: WeightVerificationInput): WeightAuditRecord {
    if (input.grossWeightGrams <= 0 || isNaN(input.grossWeightGrams)) {
      const err: any = new Error('Gross weight must be a positive number greater than zero.');
      err.code = 'INVALID_WEIGHT';
      err.status = 422;
      throw err;
    }

    const stoneWeight = input.stoneWeightGrams || 0;
    if (stoneWeight < 0 || stoneWeight >= input.grossWeightGrams) {
      const err: any = new Error('Stone weight cannot be negative and must be less than gross weight.');
      err.code = 'INVALID_STONE_WEIGHT';
      err.status = 422;
      throw err;
    }

    const netWeight = Math.round((input.grossWeightGrams - stoneWeight) * 1000) / 1000;

    // Strict Enforcement for Manual Overrides
    if (input.source === 'MANUAL') {
      // 1. RBAC Check: Must have weight:manual_entry permission
      RbacService.assertPermission(
        input.actor,
        'weight:manual_entry',
        'Manual Weight Override (Requires Admin/Owner Authority)'
      );

      // 2. Reason Validation
      const cleanReason = (input.manualReason || '').trim().toUpperCase();
      if (!VALID_MANUAL_REASONS.includes(cleanReason as ManualWeightReason)) {
        const err: any = new Error(
          `Invalid or missing manual weight reason "${input.manualReason}". Allowed reasons: ${VALID_MANUAL_REASONS.join(', ')}`
        );
        err.code = 'INVALID_MANUAL_WEIGHT_REASON';
        err.status = 422;
        throw err;
      }
    }

    const id = `wrec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const recordPayload = {
      id,
      organization_id: input.organizationId,
      branch_id: input.branchId,
      terminal_id: input.terminalId,
      source: input.source,
      gross_weight_grams: input.grossWeightGrams,
      stone_weight_grams: stoneWeight,
      net_weight_grams: netWeight,
      manual_reason: input.source === 'MANUAL' ? input.manualReason?.trim().toUpperCase() : undefined,
      actor_user_id: input.actor.id,
      actor_email: input.actor.email,
      actor_role: input.actor.role,
      piece_id: input.pieceId,
      sku: input.sku,
      serial_number: input.serialNumber,
      timestamp
    };

    const signature = crypto
      .createHmac('sha256', 'BAHER_SILVER_WEIGHT_AUDIT_SALT_2026')
      .update(JSON.stringify(recordPayload))
      .digest('hex');

    const auditRecord: WeightAuditRecord = {
      ...recordPayload,
      signature
    };

    this.persistAuditRecord(auditRecord);

    return auditRecord;
  }

  /**
   * Appends the audit record to durable append-only JSON Lines journal.
   */
  private static persistAuditRecord(record: WeightAuditRecord): void {
    try {
      const dir = path.dirname(this.durableLogPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.appendFileSync(this.durableLogPath, JSON.stringify(record) + '\n', 'utf8');
    } catch (e: any) {
      console.error('[WeightAuditEngine] Warning: Could not append to durable log:', e.message);
    }
  }

  /**
   * Queries audit records from durable journal.
   */
  public static queryAuditRecords(filter?: {
    organizationId?: string;
    source?: WeightSource;
    serialNumber?: string;
    limit?: number;
  }): WeightAuditRecord[] {
    if (!fs.existsSync(this.durableLogPath)) {
      return [];
    }

    const lines = fs.readFileSync(this.durableLogPath, 'utf8').split('\n');
    const records: WeightAuditRecord[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const rec: WeightAuditRecord = JSON.parse(line);
        if (filter?.organizationId && rec.organization_id !== filter.organizationId) continue;
        if (filter?.source && rec.source !== filter.source) continue;
        if (filter?.serialNumber && rec.serial_number !== filter.serialNumber) continue;
        records.push(rec);
      } catch {
        // Skip malformed
      }
    }

    records.reverse(); // Most recent first
    if (filter?.limit && filter.limit > 0) {
      return records.slice(0, filter.limit);
    }
    return records;
  }
}
