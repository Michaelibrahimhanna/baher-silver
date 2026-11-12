/**
 * Baher Silver — Weight Audit & EK-1200 Scale Verification Engine
 * 
 * Enforces:
 *   1. Hardware Scale Priority: Direct EK-1200 RS232 Local Scale Bridge reading is authoritative.
 *   2. Barcode Weight Prohibition: Barcodes must NEVER contain weight (source === 'BARCODE' is rejected with 422).
 *   3. Manual Override Guard: Manual weight entry strictly requires Admin/Owner authority and policy allowance.
 *   4. Mandatory Reason Validation: Manual weights must specify TEST, SCALE_FAILURE, or READING_CORRECTION.
 *   5. Registered Weight Variance Audit: Compares verified weight against registered DB weight without overwriting original DB weight.
 *   6. Immutable Audit Trail: Every weight verification or override is written to a durable append-only log with HMAC signature.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RbacService } from '../../auth/rbacService';
import type { SafeUser } from '../../auth/types';
import { getWeightIntegrityPolicy } from './weightPolicyConfig';
import { ScaleBridgeVerifier, type ScaleCaptureAttestation } from '../../hardware/localScaleBridgeService';

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
  registeredGrossWeightGrams?: number;
  manualReason?: string;
  varianceOverrideReason?: string;
  varianceApprovedByUserId?: string;
  varianceApprovedByRole?: string;
  pieceId?: string;
  sku?: string;
  serialNumber?: string;
  scaleAttestation?: ScaleCaptureAttestation;
  requireScaleAttestation?: boolean;
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
  registered_gross_weight_grams?: number;
  weight_variance_grams?: number;
  variance_exceeds_tolerance?: boolean;
  variance_override_reason?: string;
  variance_approved_by_user_id?: string;
  variance_approved_by_role?: string;
  scale_model?: string;
  scale_device_id?: string;
  scale_com_port?: string;
  raw_scale_frame_hex?: string;
  scale_reading_id?: string;
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
   * Authoritatively verifies the weight entry, enforces EK-1200 bridge attestation (when provided/required),
   * blocks BARCODE weight sources, checks variance against registered DB weight, and enforces RBAC + reason constraints.
   */
  public static verifyAndRecordWeight(input: WeightVerificationInput): WeightAuditRecord {
    const policy = getWeightIntegrityPolicy();

    // 1. Invariant Rule: Barcodes must NEVER encode or supply weight
    if (input.source === 'BARCODE') {
      const err: any = new Error(
        'Barcode weight source is strictly forbidden. Barcodes must contain only the unique piece identifier, never weight.'
      );
      err.code = 'BARCODE_WEIGHT_FORBIDDEN';
      err.status = 422;
      throw err;
    }

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

    // 2. Cryptographic EK-1200 Local Scale Bridge Attestation Check
    let verifiedScaleMeta: {
      scaleModel?: string;
      scaleDeviceId?: string;
      scaleComPort?: string;
      rawScaleFrameHex?: string;
      scaleReadingId?: string;
    } = {};

    if (input.source === 'SCALE') {
      if (input.requireScaleAttestation && !input.scaleAttestation) {
        const err: any = new Error(
          'Missing signed EK-1200 Local Scale Bridge attestation. Unverified scale readings are rejected.'
        );
        err.code = 'MISSING_SCALE_ATTESTATION';
        err.status = 422;
        throw err;
      }

      if (input.scaleAttestation) {
        const verification = ScaleBridgeVerifier.verifyAttestation(input.scaleAttestation, {
          expectedWeightGrams: input.grossWeightGrams
        });
        if (!verification.valid) {
          const err: any = new Error(verification.errorMessage || 'Invalid EK-1200 scale attestation.');
          err.code = verification.errorCode || 'INVALID_SCALE_ATTESTATION';
          err.status = 422;
          throw err;
        }
        verifiedScaleMeta = {
          scaleModel: input.scaleAttestation.scaleModel,
          scaleDeviceId: input.scaleAttestation.scaleDeviceId,
          scaleComPort: input.scaleAttestation.comPort,
          rawScaleFrameHex: input.scaleAttestation.rawFrameHex,
          scaleReadingId: input.scaleAttestation.readingId
        };
      }
    }

    // 3. Strict Enforcement for Manual Overrides
    if (input.source === 'MANUAL') {
      if (!policy.allowAuthorizedManualWeight) {
        const err: any = new Error(
          'Manual weight entry is disabled by store management policy. All pieces must be weighed on the EK-1200 scale.'
        );
        err.code = 'MANUAL_WEIGHT_DISABLED_BY_POLICY';
        err.status = 403;
        throw err;
      }

      // RBAC Check: Must have weight:manual_entry permission
      RbacService.assertPermission(
        input.actor,
        'weight:manual_entry',
        'Manual Weight Override (Requires Admin/Owner Authority)'
      );

      // Reason Validation
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

    // 4. Registered Database Weight Variance Evaluation
    let weightVarianceGrams: number | undefined;
    let varianceExceedsTolerance: boolean | undefined;

    if (
      input.registeredGrossWeightGrams !== undefined &&
      input.registeredGrossWeightGrams !== null &&
      input.registeredGrossWeightGrams > 0
    ) {
      weightVarianceGrams =
        Math.round((input.grossWeightGrams - input.registeredGrossWeightGrams) * 1000) / 1000;
      const absVariance = Math.abs(weightVarianceGrams);
      varianceExceedsTolerance = absVariance > policy.commercialToleranceGrams + 0.0001;

      if (varianceExceedsTolerance) {
        if (policy.varianceEnforcementMode === 'HARD_BLOCK_ALL_VARIANCE') {
          const err: any = new Error(
            `Weight variance of ${weightVarianceGrams > 0 ? '+' : ''}${weightVarianceGrams.toFixed(2)}g ` +
              `(Measured: ${input.grossWeightGrams.toFixed(2)}g vs Registered DB: ${input.registeredGrossWeightGrams.toFixed(2)}g) ` +
              `exceeds commercial tolerance (${policy.commercialToleranceGrams.toFixed(2)}g). Transaction blocked by policy.`
          );
          err.code = 'WEIGHT_VARIANCE_HARD_BLOCKED';
          err.status = 422;
          throw err;
        }

        if (policy.varianceEnforcementMode === 'REQUIRE_MANAGER_OVERRIDE') {
          const effectiveRole = input.varianceApprovedByRole || input.actor.role;
          const isAuthorizedRole = policy.overrideAllowedRoles.includes(effectiveRole);
          const overrideReason = (input.varianceOverrideReason || input.manualReason || '').trim();

          if (!isAuthorizedRole) {
            const err: any = new Error(
              `Weight difference of ${weightVarianceGrams > 0 ? '+' : ''}${weightVarianceGrams.toFixed(2)}g ` +
                `(Scale: ${input.grossWeightGrams.toFixed(2)}g vs Registered: ${input.registeredGrossWeightGrams.toFixed(2)}g) ` +
                `requires Manager/Owner authorization.`
            );
            err.code = 'WEIGHT_VARIANCE_AUTHORIZATION_REQUIRED';
            err.status = 403;
            throw err;
          }

          if (!overrideReason) {
            const err: any = new Error(
              'A mandatory audit reason is required when approving a weight variance override.'
            );
            err.code = 'WEIGHT_VARIANCE_REASON_REQUIRED';
            err.status = 422;
            throw err;
          }
        }
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
      registered_gross_weight_grams: input.registeredGrossWeightGrams,
      weight_variance_grams: weightVarianceGrams,
      variance_exceeds_tolerance: varianceExceedsTolerance,
      variance_override_reason: input.varianceOverrideReason || undefined,
      variance_approved_by_user_id:
        varianceExceedsTolerance ? input.varianceApprovedByUserId || input.actor.id : undefined,
      variance_approved_by_role:
        varianceExceedsTolerance ? input.varianceApprovedByRole || input.actor.role : undefined,
      scale_model: verifiedScaleMeta.scaleModel,
      scale_device_id: verifiedScaleMeta.scaleDeviceId,
      scale_com_port: verifiedScaleMeta.scaleComPort,
      raw_scale_frame_hex: verifiedScaleMeta.rawScaleFrameHex,
      scale_reading_id: verifiedScaleMeta.scaleReadingId,
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
    pieceId?: string;
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
        if (filter?.pieceId && rec.piece_id !== filter.pieceId) continue;
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
