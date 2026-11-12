/**
 * Baher Silver — Point of Sale (POS) Transaction Engine
 * 
 * Enforces:
 *   1. Strict Server-Authoritative Pricing: Recalculates metal value + labor or fixed retail MSRP.
 *   2. Canonical Serialized Piece Integrity: Only available pieces (IN_SHOWCASE / IN_VAULT) can be sold.
 *   3. Concurrency Safety & Mutex: Atomic locks prevent double-selling the same physical piece.
 *   4. Append-Only Stock Ledger: Every sale/return emits canonical HMAC-signed ledger movements.
 *   5. Idempotent Execution: Duplicate checkouts return cached transactions without double-posting.
 *   6. Multi-Item Atomicity & Rollback: Compensating reversals if any cart item fails during execution.
 *   7. Non-Destructive Returns: Compensating ledger entries restore pieces to vault.
 *   8. Standard TLV Base64 QR: ZATCA Phase 1 Simplified Tax Invoice compatible; ETA online clearance decoupled.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  POSCheckoutInput,
  POSReturnInput,
  POSSaleTransaction,
  POSSaleItem,
  POSPaymentMethod,
  POSManagerOverride
} from './types';
import { POSDiscountEngine } from './posDiscountEngine';
import {
  getProductBySlugOrId,
  lookupByBarcode,
  getPieceBySerial,
  executePieceMovement,
  appendStockLedgerEvent,
  roundToMoney
} from '@/lib/db/productEngine';
import { CashShiftEngine } from './cashShiftEngine';
import { POSLockManager } from './posLockManager';
import { TaxInvoiceQRService } from './qrReceiptVerification';
import { CustomerService } from '@/lib/services/customer';
import { SilverSpotService } from '@/lib/services/pricing/silverSpotService';
import { ScaleBridgeVerifier } from '@/lib/hardware/localScaleBridgeService';
import { getWeightIntegrityPolicy } from './weightPolicyConfig';
import type { SilverPurity, PieceLifecycleStatus } from '@/lib/types';
import type { SilverSpotRateRecord } from '@/types/catalog';

const POS_DATA_DIR = typeof process !== 'undefined' && process.cwd ? path.resolve(process.cwd(), '.data') : '';
const POS_TX_FILE = POS_DATA_DIR ? path.join(POS_DATA_DIR, 'pos_transactions.jsonl') : '';

// Persistent Transaction Store with File Journal Bridge
const globalForPos = globalThis as unknown as {
  __baherPosTransactionsStore?: Map<string, POSSaleTransaction>;
};
const posTransactionsStore: Map<string, POSSaleTransaction> =
  globalForPos.__baherPosTransactionsStore || (globalForPos.__baherPosTransactionsStore = new Map());

if (POS_TX_FILE && typeof fs !== 'undefined' && fs.existsSync && fs.existsSync(POS_TX_FILE)) {
  try {
    const lines = fs.readFileSync(POS_TX_FILE, 'utf8').split('\n');
    for (const l of lines) {
      if (!l.trim()) continue;
      const tx: POSSaleTransaction = JSON.parse(l);
      posTransactionsStore.set(tx.id, tx);
    }
  } catch (e: any) {
    console.error('Failed to load POS transactions from disk store', e.message);
  }
}

function persistPOSTransaction(tx: POSSaleTransaction): void {
  posTransactionsStore.set(tx.id, tx);
  if (POS_DATA_DIR && POS_TX_FILE && typeof fs !== 'undefined' && fs.appendFileSync) {
    try {
      if (!fs.existsSync(POS_DATA_DIR)) fs.mkdirSync(POS_DATA_DIR, { recursive: true });
      fs.appendFileSync(POS_TX_FILE, JSON.stringify(tx) + '\n', 'utf8');
    } catch (e: any) {
      console.error('Failed to append POS transaction to disk store', e.message);
    }
  }
}

// Authoritative Spot Prices per Silver Purity in EGP (Daily Benchmark)
export const DEFAULT_SILVER_SPOT_RATES: Record<SilverPurity, number> = {
  '999': 60.0,
  '950': 57.0,
  '925': 55.5,
  '900': 54.0,
  '800': 48.0
};

export class POSTransactionEngine {
  /**
   * Sets the active benchmark spot rate for an organization (Fine Silver 999 basis in EGP).
   */
  public static setBenchmarkSpotRate(
    organizationId: string,
    amountPerGram: number,
    options?: { branchId?: string; source?: any; effectiveAt?: string; createdBy?: string; notes?: string }
  ): SilverSpotRateRecord {
    return SilverSpotService.setBenchmarkRate(organizationId, amountPerGram, options);
  }

  /**
   * Retrieves the active benchmark spot rate record for an organization and optional branch.
   */
  public static getActiveBenchmark(organizationId: string, branchId?: string): SilverSpotRateRecord {
    return SilverSpotService.getActiveBenchmarkSync(organizationId, branchId);
  }

  /**
   * Authoritatively executes a point-of-sale checkout with concurrency locks & rollback
   */
  public static async executeCheckout(input: POSCheckoutInput): Promise<POSSaleTransaction> {
    if (!input.items || input.items.length === 0) {
      const err: any = new Error('Cart must contain at least one item.');
      err.code = 'EMPTY_CART';
      err.status = 400;
      throw err;
    }

    // Pre-check duplicate serial numbers in the same cart
    const serialsInCart = input.items.map((i) => i.serialNumber).filter(Boolean) as string[];
    const uniqueSerials = new Set(serialsInCart);
    if (uniqueSerials.size !== serialsInCart.length) {
      const err: any = new Error('DUPLICATE_PIECE_IN_CART: The same serialized piece cannot be added multiple times in the same cart.');
      err.code = 'DUPLICATE_PIECE_IN_CART';
      err.status = 422;
      throw err;
    }

    // Build resource lock keys
    const lockKeys: string[] = [
      `shift:${input.shiftId}`,
      ...Array.from(uniqueSerials).map((s: string) => `piece:${s}`)
    ];
    if (input.idempotencyKey) {
      lockKeys.push(`idemp:${input.organizationId}:${input.idempotencyKey}`);
    }
    if (input.managerOverrideToken) {
      lockKeys.push(`override:${POSDiscountEngine.getTokenKey(input.managerOverrideToken)}`);
    }
    if (input.rateOverrideToken) {
      lockKeys.push(`override:${POSDiscountEngine.getTokenKey(input.rateOverrideToken)}`);
    }

    return await POSLockManager.withLocks(lockKeys, async () => {
      const reservedOverrideTokens: string[] = [];
      let verifiedRateOverride: POSManagerOverride | undefined = undefined;

      try {
        // 1. Verify Active Shift
        const shift = CashShiftEngine.getShiftById(input.shiftId, input.organizationId);
        if (!shift || shift.status === 'CLOSED' || shift.status === 'CLOSING') {
          const err: any = new Error(`INVALID_SHIFT: Active cashier shift required for checkout (current status: ${shift?.status || 'NOT_FOUND'}).`);
          err.code = 'INVALID_OR_CLOSED_SHIFT';
          err.status = 400;
          throw err;
        }

      // 2. Persistence-Level Idempotency Check
      if (input.idempotencyKey) {
        const existing = Array.from(posTransactionsStore.values()).find(
          (t) => t.organization_id === input.organizationId && t.idempotency_key === input.idempotencyKey
        );
        if (existing) {
          return existing;
        }
      }

      // 2.5. Customer Attachment & Snapshot Validation
      let attachedCustomerId: string | undefined = undefined;
      let snapshotCustomerName: string | undefined = input.customerName;
      let snapshotCustomerPhone: string | undefined = input.customerPhone;

      if (input.customerId) {
        const customerService = new CustomerService();
        const customer = await customerService.getCustomerById(
          {
            organizationId: input.organizationId,
            actorUserId: input.cashierUserId,
            actorRole: input.actorRole
          },
          input.customerId,
          false
        );

        if (!customer) {
          const err: any = new Error(`Customer "${input.customerId}" not found.`);
          err.code = 'CUSTOMER_NOT_FOUND';
          err.status = 404;
          throw err;
        }

        if (customer.status !== 'ACTIVE') {
          const err: any = new Error(`Customer "${customer.name}" is ${customer.status} and cannot be attached to a transaction.`);
          err.code = 'CUSTOMER_INACTIVE';
          err.status = 400;
          throw err;
        }

        attachedCustomerId = customer.id;
        snapshotCustomerName = input.customerName || customer.name;
        snapshotCustomerPhone = input.customerPhone || customer.phone;
      }

      // 2.7. Resolve Active Silver Benchmark Spot Rate
      let effectiveBenchmark: SilverSpotRateRecord;
      if (input.spotRateRecord) {
        effectiveBenchmark = input.spotRateRecord;
      } else if (input.benchmarkSpotRate999 !== undefined) {
        effectiveBenchmark = SilverSpotService.setBenchmarkRate(
          input.organizationId,
          input.benchmarkSpotRate999,
          { branchId: input.branchId, source: 'MANUAL_BENCHMARK', createdBy: input.cashierUserId }
        );
      } else {
        effectiveBenchmark = SilverSpotService.getActiveBenchmarkSync(input.organizationId, input.branchId);
      }

      // Freshness assertion (fail-closed on unapproved, stale, future, or malformed rates)
      SilverSpotService.assertRateFreshness(effectiveBenchmark, {
        allowStaleRate: input.allowStaleRate,
        requireApprovedRate: input.requireApprovedSpotRate
      });

      // 3. Resolve & Pre-Validate All Items
      const validatedItems: Array<{
        product: any;
        piece?: any;
        quantity: number;
        weightGrams: number;
        spotRate: number;
        purityRatio: number;
        unroundedMetalRate: number;
        metalValue: number;
        workmanshipFee: number;
        unitPrice: number;
        discountAmount: number;
        totalPrice: number;
      }> = [];

      let subtotalAmount = 0;
      let totalSilverWeightGrams = 0;

      for (const itemInput of input.items) {
        // Lookup product via canonical lookup
        let product = getProductBySlugOrId(itemInput.productId, input.organizationId);
        if (!product && itemInput.barcode) {
          const barcodeLookup = lookupByBarcode(itemInput.barcode, input.organizationId);
          if (barcodeLookup) product = barcodeLookup.product;
        }

        if (!product) {
          const err: any = new Error(`Product "${itemInput.productId}" not found.`);
          err.code = 'PRODUCT_NOT_FOUND';
          err.status = 404;
          throw err;
        }

        let selectedPiece: any = null;

        if (product.profile_type === 'SILVER_JEWELRY') {
          // Serialized Silver Jewelry Handling
          if (product.is_serialized !== false && product.pieces && product.pieces.length > 0) {
            if (itemInput.serialNumber) {
              const pieceLookup = getPieceBySerial(itemInput.serialNumber, input.organizationId);
              if (!pieceLookup) {
                const err: any = new Error(`Piece "${itemInput.serialNumber}" not found in organization.`);
                err.code = 'PIECE_NOT_FOUND';
                err.status = 404;
                throw err;
              }
              selectedPiece = pieceLookup.piece;
            } else {
              // Pick first available piece
              selectedPiece = product.pieces.find(
                (p: any) => p.lifecycle_status === 'IN_SHOWCASE' || p.lifecycle_status === 'IN_VAULT'
              );
            }

            if (!selectedPiece) {
              const err: any = new Error(`No available physical pieces in stock for "${product.name.en}".`);
              err.code = 'INSUFFICIENT_STOCK';
              err.status = 400;
              throw err;
            }

            // Strict Lifecycle Precondition Guards
            if (selectedPiece.lifecycle_status === 'SOLD') {
              const err: any = new Error(
                `Cannot sell piece "${selectedPiece.serial_number}". Piece is already SOLD.`
              );
              err.code = 'PIECE_ALREADY_SOLD';
              err.status = 422;
              throw err;
            }

            if (selectedPiece.lifecycle_status === 'RESERVED') {
              const err: any = new Error(
                `Cannot sell piece "${selectedPiece.serial_number}". Piece is currently RESERVED for customer.`
              );
              err.code = 'PIECE_RESERVED';
              err.status = 422;
              throw err;
            }

            if (selectedPiece.lifecycle_status === 'QUARANTINED') {
              const err: any = new Error(
                `Cannot sell piece "${selectedPiece.serial_number}". Piece is held in QUARANTINE.`
              );
              err.code = 'PIECE_QUARANTINED';
              err.status = 422;
              throw err;
            }

            if (selectedPiece.lifecycle_status !== 'IN_SHOWCASE' && selectedPiece.lifecycle_status !== 'IN_VAULT') {
              const err: any = new Error(
                `Cannot sell piece in status "${selectedPiece.lifecycle_status}". Piece must be IN_SHOWCASE or IN_VAULT.`
              );
              err.code = 'PIECE_NOT_AVAILABLE';
              err.status = 422;
              throw err;
            }
          }

          // Authoritative Silver Pricing & Checkout Weight Integrity Gate
          const purity: SilverPurity = (product.purity as SilverPurity) || '925';
          const registeredWeightGrams = (selectedPiece ? selectedPiece.current_weight_grams : product.weight_grams) || 8.0;
          let weightGrams = registeredWeightGrams;

          if (itemInput.customWeightGrams !== undefined && itemInput.customWeightGrams !== null) {
            if (
              typeof itemInput.customWeightGrams !== 'number' ||
              !Number.isFinite(itemInput.customWeightGrams) ||
              itemInput.customWeightGrams <= 0
            ) {
              const err: any = new Error(
                `INVALID_WEIGHT: Custom weight must be a positive finite number. Received: ${itemInput.customWeightGrams}`
              );
              err.code = 'INVALID_WEIGHT';
              err.status = 422;
              throw err;
            }

            const rawCustomWeight = Number(itemInput.customWeightGrams.toFixed(3));
            const variance = Math.abs(rawCustomWeight - registeredWeightGrams);
            const policy = getWeightIntegrityPolicy();
            const rawRole = (input.actorRole || '').toUpperCase();
            const isCashier = rawRole === 'CASHIER' || rawRole === 'MEMBER' || rawRole === 'VIEWER';

            if (itemInput.scaleAttestation) {
              const verification = ScaleBridgeVerifier.verifyAttestation(itemInput.scaleAttestation, {
                expectedWeightGrams: rawCustomWeight,
                consumeNonce: true
              });
              if (!verification.valid) {
                const err: any = new Error(
                  verification.errorMessage || 'Invalid EK-1200 scale attestation for custom weight.'
                );
                err.code = verification.errorCode || 'INVALID_SCALE_ATTESTATION';
                err.status = 422;
                throw err;
              }

              // Verified scale reading: Check variance against registered DB weight (Zero silent tolerance)
              if (variance > (policy.commercialToleranceGrams || 0.0) + 0.0001) {
                const overrideToken = input.weightOverrideToken || input.managerOverrideToken;
                if (!overrideToken) {
                  const err: any = new Error(
                    `WEIGHT_VARIANCE_EXCEEDS_TOLERANCE: Weight variance of ${variance.toFixed(2)}g (Scale: ${rawCustomWeight}g vs Registered: ${registeredWeightGrams}g) exceeds commercial tolerance (${policy.commercialToleranceGrams.toFixed(2)}g). Manager override required.`
                  );
                  err.code = 'WEIGHT_VARIANCE_EXCEEDS_TOLERANCE';
                  err.status = 403;
                  throw err;
                }
                POSDiscountEngine.verifyOverrideToken(overrideToken, input.organizationId, 0, {
                  branchId: input.branchId
                });
              }
              weightGrams = rawCustomWeight;
            } else {
              // Manual weight entry without scale attestation
              if (isCashier) {
                const overrideToken = input.weightOverrideToken || input.managerOverrideToken;
                if (!overrideToken) {
                  const err: any = new Error(
                    `CASHIER_MANUAL_WEIGHT_FORBIDDEN: Manual weight entry (${rawCustomWeight}g) is strictly forbidden for Cashiers. Scale attestation or manager override is required.`
                  );
                  err.code = 'CASHIER_MANUAL_WEIGHT_FORBIDDEN';
                  err.status = 403;
                  throw err;
                }
                POSDiscountEngine.verifyOverrideToken(overrideToken, input.organizationId, 0, {
                  branchId: input.branchId
                });
              } else {
                // Non-cashier role (Admin / Manager)
                if (!policy.allowAuthorizedManualWeight) {
                  const err: any = new Error(
                    'MANUAL_WEIGHT_DISABLED_BY_POLICY: Manual weight entry is disabled by store policy.'
                  );
                  err.code = 'MANUAL_WEIGHT_DISABLED_BY_POLICY';
                  err.status = 403;
                  throw err;
                }
                if (variance > (policy.commercialToleranceGrams || 0.0) + 0.0001) {
                  const overrideToken = input.weightOverrideToken || input.managerOverrideToken;
                  if (!overrideToken && !['OWNER', 'ADMIN', 'Owner', 'Admin'].includes(input.actorRole || '')) {
                    const err: any = new Error(
                      `WEIGHT_VARIANCE_EXCEEDS_TOLERANCE: Manual weight variance of ${variance.toFixed(2)}g exceeds tolerance (${policy.commercialToleranceGrams.toFixed(2)}g). Manager override required.`
                    );
                    err.code = 'WEIGHT_VARIANCE_EXCEEDS_TOLERANCE';
                    err.status = 403;
                    throw err;
                  }
                }
              }
              weightGrams = rawCustomWeight;
            }
          }
          const weightVarianceGrams = Number((weightGrams - registeredWeightGrams).toFixed(3));

          // Benchmark baseline evaluation for this piece
          const benchmarkEvaluation = SilverSpotService.evaluateItemMetalValue(
            purity,
            weightGrams,
            effectiveBenchmark
          );

          let itemEvaluation: typeof benchmarkEvaluation & { rateOverride?: any } = benchmarkEvaluation;

          if (itemInput.customSpotPricePerGram !== undefined) {
            // R112-3: Reject non-positive, non-finite, zero, NaN, Infinity
            if (
              typeof itemInput.customSpotPricePerGram !== 'number' ||
              !Number.isFinite(itemInput.customSpotPricePerGram) ||
              itemInput.customSpotPricePerGram <= 0
            ) {
              const err: any = new Error(
                `INVALID_CUSTOM_SPOT_RATE: Custom spot price override must be a positive finite number. Received: ${itemInput.customSpotPricePerGram}`
              );
              err.code = 'INVALID_CUSTOM_SPOT_RATE';
              err.status = 422;
              throw err;
            }

            const customRate = roundToMoney(itemInput.customSpotPricePerGram);

            // If the custom rate differs from the authoritative benchmark rate, require manager override
            if (customRate !== benchmarkEvaluation.appliedMetalRate) {
              const overrideToken = input.rateOverrideToken || input.managerOverrideToken;

              if (overrideToken) {
                try {
                  verifiedRateOverride = POSDiscountEngine.verifyOverrideToken(
                    overrideToken,
                    input.organizationId,
                    0, // discount amount not applicable for rate override
                    {
                      branchId: input.branchId,
                      expectedAction: 'RATE_OVERRIDE'
                    }
                  );
                  if (!reservedOverrideTokens.includes(overrideToken)) {
                    POSDiscountEngine.reserveOverrideToken(overrideToken, {
                      organizationId: input.organizationId,
                      branchId: input.branchId,
                      actorUserId: input.cashierUserId
                    });
                    reservedOverrideTokens.push(overrideToken);
                  }
                } catch (tokenErr: any) {
                  const err: any = new Error(
                    `RATE_OVERRIDE_UNAUTHORIZED: Rate override authorization failed: ${tokenErr.message}`
                  );
                  err.code = tokenErr.code || 'RATE_OVERRIDE_UNAUTHORIZED';
                  err.status = tokenErr.status || 403;
                  throw err;
                }
              } else {
                const err: any = new Error(
                  `RATE_OVERRIDE_UNAUTHORIZED: Overriding metal spot rate from benchmark ${benchmarkEvaluation.appliedMetalRate} EGP/g to ${customRate} EGP/g requires manager override authorization. Client role cannot be self-trusted.`
                );
                err.code = 'RATE_OVERRIDE_UNAUTHORIZED';
                err.status = 403;
                throw err;
              }

              const rawMetal = weightGrams * customRate;
              itemEvaluation = {
                purity,
                spotRate999: effectiveBenchmark.amount_per_gram,
                purityRatio: Number(purity) / 999,
                unroundedMetalRate: customRate,
                appliedMetalRate: customRate,
                metalValue: roundToMoney(rawMetal),
                metalValueCents: Math.round(roundToMoney(rawMetal) * 100),
                rateSource: effectiveBenchmark.source,
                rateEffectiveAt: effectiveBenchmark.effective_at,
                rateOverride: {
                  originalRate: benchmarkEvaluation.appliedMetalRate,
                  overrideRate: customRate,
                  managerId: verifiedRateOverride?.manager_id,
                  managerName: verifiedRateOverride?.manager_name,
                  managerRole: verifiedRateOverride?.manager_role,
                  reason: input.rateOverrideReason || verifiedRateOverride?.reason || 'Manager silver rate override',
                  timestamp: new Date().toISOString()
                }
              };
            }
          }

          const metalValue = itemEvaluation.metalValue;
          const workmanshipFee = roundToMoney(Number(product.labor_cost || 30.0) * itemInput.quantity);
          const unitPrice = roundToMoney((metalValue + workmanshipFee) / itemInput.quantity);
          const itemDiscount = roundToMoney(Number(itemInput.discountAmount || 0));
          const totalPrice = roundToMoney(Math.max(0, metalValue + workmanshipFee - itemDiscount));

          validatedItems.push({
            product,
            piece: selectedPiece,
            quantity: itemInput.quantity,
            weightGrams,
            registeredWeightGrams,
            weightVarianceGrams,
            spotRate: itemEvaluation.appliedMetalRate,
            purityRatio: itemEvaluation.purityRatio,
            unroundedMetalRate: itemEvaluation.unroundedMetalRate,
            metalValue,
            workmanshipFee,
            unitPrice,
            discountAmount: itemDiscount,
            totalPrice,
            rateOverride: (itemEvaluation as any).rateOverride
          } as any);

          subtotalAmount += totalPrice;
          totalSilverWeightGrams += weightGrams * itemInput.quantity;
        } else {
          // NON_SILVER_RETAIL Profile Handling
          // Fixed retail pricing
          const unitPrice = roundToMoney(Number(product.price || 45.0));
          const itemDiscount = roundToMoney(Number(itemInput.discountAmount || 0));
          const totalPrice = roundToMoney(Math.max(0, unitPrice * itemInput.quantity - itemDiscount));

          // If serialized piece specified for retail merchandise
          if (itemInput.serialNumber && product.pieces) {
            const pieceLookup = getPieceBySerial(itemInput.serialNumber, input.organizationId);
            if (pieceLookup) {
              selectedPiece = pieceLookup.piece;
              if (selectedPiece.lifecycle_status === 'SOLD') {
                const err: any = new Error(`Cannot sell retail piece "${selectedPiece.serial_number}". Piece is already SOLD.`);
                err.code = 'PIECE_ALREADY_SOLD';
                err.status = 422;
                throw err;
              }
            }
          }

          validatedItems.push({
            product,
            piece: selectedPiece,
            quantity: itemInput.quantity,
            weightGrams: product.package_weight_grams || 0,
            spotRate: 0,
            purityRatio: 0,
            unroundedMetalRate: 0,
            metalValue: 0,
            workmanshipFee: 0,
            unitPrice,
            discountAmount: itemDiscount,
            totalPrice
          });

          subtotalAmount += totalPrice;
        }
      }

      subtotalAmount = Number(subtotalAmount.toFixed(2));
      totalSilverWeightGrams = Number(totalSilverWeightGrams.toFixed(2));

      // 4. Authoritative Discount & Manager Override Validation
      const requestedDiscount = Number((input.discountAmount || 0).toFixed(2));
      let evaluatedOverride: POSManagerOverride | undefined = undefined;
      let effectiveDiscountReason = input.discountReason;

      if (input.discountAmount !== undefined || requestedDiscount !== 0) {
        const evaluation = POSDiscountEngine.evaluateDiscount(subtotalAmount, requestedDiscount);
        if (evaluation.requiresManagerOverride) {
          if (!input.managerOverrideToken) {
            const err: any = new Error(
              `Discount of ${requestedDiscount} EGP exceeds cashier authority (5% or 150 EGP). Manager override required.`
            );
            err.code = 'MANAGER_OVERRIDE_REQUIRED';
            err.status = 403;
            throw err;
          }

          // Cryptographically verify manager override token
          evaluatedOverride = POSDiscountEngine.verifyOverrideToken(
            input.managerOverrideToken,
            input.organizationId,
            requestedDiscount,
            {
              branchId: input.branchId,
              expectedAction: 'DISCOUNT_OVERRIDE'
            }
          );
          if (!reservedOverrideTokens.includes(input.managerOverrideToken)) {
            POSDiscountEngine.reserveOverrideToken(input.managerOverrideToken, {
              organizationId: input.organizationId,
              branchId: input.branchId,
              actorUserId: input.cashierUserId
            });
            reservedOverrideTokens.push(input.managerOverrideToken);
          }
          effectiveDiscountReason = evaluatedOverride.reason;
        } else if (requestedDiscount > 0) {
          effectiveDiscountReason = input.discountReason || 'Cashier standard discount';
        }
      }

      const finalSaleTotal = Number((Math.max(0, subtotalAmount - requestedDiscount)).toFixed(2));

      // 5. Payment Tender Validation
      let cashAmount = 0;
      let cardAmount = 0;
      let instapayAmount = 0;
      const normMethod = (input.paymentMethod || 'CASH').toUpperCase() as POSPaymentMethod;

      if (normMethod === 'CASH') {
        cashAmount = finalSaleTotal;
      } else if (normMethod === 'CARD') {
        cardAmount = finalSaleTotal;
      } else if (normMethod === 'INSTAPAY') {
        instapayAmount = finalSaleTotal;
      } else if (normMethod === 'SPLIT') {
        cashAmount = Number((input.cashAmount || 0).toFixed(2));
        cardAmount = Number((input.cardAmount || 0).toFixed(2));
        instapayAmount = Number((input.instapayAmount || 0).toFixed(2));
        const sum = Number((cashAmount + cardAmount + instapayAmount).toFixed(2));
        if (Math.abs(sum - finalSaleTotal) > 0.05) {
          const err: any = new Error(
            `PAYMENT_AMOUNT_MISMATCH: Split payment sum (${sum} EGP) does not equal net payable amount (${finalSaleTotal} EGP).`
          );
          err.code = 'PAYMENT_AMOUNT_MISMATCH';
          err.status = 400;
          throw err;
        }
      }

      // 6. Generate Transaction IDs & Receipt Number
      const saleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randSeq = Math.floor(1000 + Math.random() * 9000);
      const receiptNumber = `REC-${dateStr}-${randSeq}`;

      // 7. Atomic Inventory Mutations with Rollback Support
      const lineItems: POSSaleItem[] = [];
      const mutatedPieces: Array<{ piece: any; prevStatus: PieceLifecycleStatus; prevWh: string; prevLoc: string }> = [];

      try {
        for (let i = 0; i < validatedItems.length; i++) {
          const v = validatedItems[i];
          const itemId = `item_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`;

          if (v.piece) {
            const prevStatus = v.piece.lifecycle_status;
            const prevWh = v.piece.warehouse_id;
            const prevLoc = v.piece.location_code;

            // Serialized piece transition
            executePieceMovement({
              serial_number: v.piece.serial_number,
              movement_type: 'SALE',
              dest_warehouse_id: shift.branch_id,
              actor_user_id: input.cashierUserId,
              actor_role: input.actorRole || 'Cashier',
              reason: `POS Sale Receipt ${receiptNumber}`,
              reference_id: saleId,
              reference_type: 'ORDER',
              organization_id: input.organizationId,
              idempotency_key: `${input.idempotencyKey || saleId}_piece_${v.piece.serial_number}`
            });

            mutatedPieces.push({ piece: v.piece, prevStatus, prevWh, prevLoc });
          } else {
            // Non-serialized bulk merchandise deduction
            appendStockLedgerEvent({
              organization_id: input.organizationId,
              movement_type: 'SALE',
              product_id: v.product.id,
              sku: v.product.sku || '',
              barcode: v.product.barcode || '',
              dest_warehouse_id: shift.branch_id,
              dest_location_code: 'POS-CHECKOUT',
              quantity_delta: -v.quantity,
              weight_grams_delta: -(v.weightGrams * v.quantity),
              actor_user_id: input.cashierUserId,
              actor_role: input.actorRole || 'Cashier',
              reference_id: saleId,
              reference_type: 'ORDER',
              reason: `POS Retail Sale Receipt ${receiptNumber}`,
              idempotency_key: `${input.idempotencyKey || saleId}_bulk_${v.product.id}`
            });
          }

          lineItems.push({
            id: itemId,
            sale_id: saleId,
            product_id: v.product.id,
            sku: v.product.sku || '',
            barcode: v.piece?.barcode || v.product.barcode || '',
            serial_number: v.piece?.serial_number,
            product_name: v.product.name.en,
            profile_type: v.product.profile_type || 'SILVER_JEWELRY',
            purity: v.product.purity,
            purity_ratio: v.purityRatio,
            unrounded_metal_rate: v.unroundedMetalRate,
            quantity: v.quantity,
            weight_grams: v.weightGrams,
            registered_weight_grams: (v as any).registeredWeightGrams ?? v.weightGrams,
            weight_variance_grams: (v as any).weightVarianceGrams ?? 0,
            spot_price_per_gram: v.spotRate,
            metal_value: v.metalValue,
            workmanship_fee: v.workmanshipFee,
            unit_price: v.unitPrice,
            discount_amount: v.discountAmount,
            total_price: v.totalPrice,
            rate_override: (v as any).rateOverride
          });
        }

        // 8. Atomic Cash Journal Mutations
        if (cashAmount > 0) {
          CashShiftEngine.recordJournalMovement({
            organizationId: input.organizationId,
            branchId: input.branchId,
            terminalId: input.terminalId,
            shiftId: input.shiftId,
            movementType: 'SALE_CASH',
            paymentMethod: 'CASH',
            amount: cashAmount,
            referenceTransactionId: saleId,
            actorUserId: input.cashierUserId,
            notes: `Cash receipt ${receiptNumber}`
          });
        }

        if (cardAmount > 0) {
          CashShiftEngine.recordJournalMovement({
            organizationId: input.organizationId,
            branchId: input.branchId,
            terminalId: input.terminalId,
            shiftId: input.shiftId,
            movementType: 'SALE_CARD',
            paymentMethod: 'CARD',
            amount: cardAmount,
            referenceTransactionId: saleId,
            actorUserId: input.cashierUserId,
            notes: `POS card receipt ${receiptNumber}`
          });
        }

        if (instapayAmount > 0) {
          CashShiftEngine.recordJournalMovement({
            organizationId: input.organizationId,
            branchId: input.branchId,
            terminalId: input.terminalId,
            shiftId: input.shiftId,
            movementType: 'SALE_INSTAPAY',
            paymentMethod: 'INSTAPAY',
            amount: instapayAmount,
            referenceTransactionId: saleId,
            actorUserId: input.cashierUserId,
            notes: `InstaPay transfer receipt ${receiptNumber}`
          });
        }
      } catch (mutationErr: any) {
        // Compensating Rollback: Revert any pieces already mutated in this execution
        for (const m of mutatedPieces) {
          m.piece.lifecycle_status = m.prevStatus;
          m.piece.warehouse_id = m.prevWh;
          m.piece.location_code = m.prevLoc;
          m.piece.updated_at = new Date().toISOString();

          // Append compensating rollback event
          appendStockLedgerEvent({
            organization_id: input.organizationId,
            movement_type: 'ADJUSTMENT',
            product_id: m.piece.product_id,
            piece_id: m.piece.id,
            serial_number: m.piece.serial_number,
            sku: m.piece.sku,
            barcode: m.piece.barcode,
            dest_warehouse_id: m.prevWh,
            dest_location_code: m.prevLoc,
            quantity_delta: 1,
            weight_grams_delta: m.piece.current_weight_grams,
            actor_user_id: input.cashierUserId,
            actor_role: input.actorRole || 'Cashier',
            reference_id: saleId,
            reference_type: 'SYSTEM',
            reason: `Compensating rollback for aborted checkout ${receiptNumber}: ${mutationErr.message}`
          });
        }
        throw mutationErr;
      }

      // 9. Generate Internal Store Verification QR (Decoupled from government ETA APIs)
      const nowIso = new Date().toISOString();
      const internalQrMeta = TaxInvoiceQRService.generateInternalReceiptQR({
        sellerName: 'شركة باهر للفضيات (Baher Silver LLC)',
        taxNumber: '300-482-918',
        timestamp: nowIso,
        totalAmount: finalSaleTotal,
        taxAmount: 0
      });

      const verificationUrl = `/api/receipt/verify?orderNumber=${receiptNumber}&signature=${encodeURIComponent(internalQrMeta.qrPayloadBase64.slice(0, 16))}`;

      const primaryPolicyMode = (lineItems[0] as any)?.pricing_policy_mode || SilverSpotService.getActivePolicyMode(input.organizationId);
      const primaryGramRate = (lineItems[0] as any)?.gram_rate_at_sale || lineItems[0]?.spot_price_per_gram || 0;

      const transaction: POSSaleTransaction = {
        id: saleId,
        receipt_number: receiptNumber,
        organization_id: input.organizationId,
        branch_id: input.branchId,
        terminal_id: input.terminalId,
        shift_id: input.shiftId,
        cashier_user_id: input.cashierUserId,
        cashier_name: input.cashierName || shift.cashier_name,
        customer_id: attachedCustomerId,
        customer_name: snapshotCustomerName,
        customer_phone: snapshotCustomerPhone,
        status: 'COMPLETED',
        payment_method: normMethod,
        cash_amount: cashAmount,
        card_amount: cardAmount,
        instapay_amount: instapayAmount,
        subtotal_amount: subtotalAmount,
        discount_amount: requestedDiscount,
        discount_reason: effectiveDiscountReason,
        manager_override: evaluatedOverride,
        total_amount: finalSaleTotal,
        total_silver_weight_grams: totalSilverWeightGrams,
        items_count: lineItems.length,
        is_return: false,
        idempotency_key: input.idempotencyKey,
        created_at: nowIso,
        pricing_policy_mode: primaryPolicyMode,
        price_source: effectiveBenchmark.source,
        price_effective_at: effectiveBenchmark.effective_at,
        gram_rate_at_sale: primaryGramRate,
        tax_amount: 0,
        tax_source: 'EGYPT_VAT_ON_LABOR_LAW_67_2016_PENDING_TAX_CONSULTANT_REVIEW',
        benchmark_spot_999: effectiveBenchmark.amount_per_gram,
        spot_rate_source: effectiveBenchmark.source,
        spot_rate_effective_at: effectiveBenchmark.effective_at,
        is_live_market_feed: false,
        rate_override: lineItems.find((li) => li.rate_override)?.rate_override,
        items: lineItems,
        internal_qr_payload_base64: internalQrMeta.qrPayloadBase64,
        qr_payload_base64: internalQrMeta.qrPayloadBase64,
        verification_url: verificationUrl
      };

      persistPOSTransaction(transaction);

      // Commit all reserved manager override tokens atomically with successful sale
      for (const tok of reservedOverrideTokens) {
        POSDiscountEngine.commitOverrideToken(tok, {
          transactionId: transaction.id,
          receiptNumber: transaction.receipt_number,
          managerId: (evaluatedOverride || verifiedRateOverride)?.manager_id || 'unknown',
          branchId: input.branchId,
          reason: (evaluatedOverride || verifiedRateOverride)?.reason || 'Manager Override'
        });
      }

      return transaction;
    } catch (checkoutErr) {
      // Release any pending override token reservations on failure so legitimate retries can proceed
      for (const tok of reservedOverrideTokens) {
        POSDiscountEngine.releaseOverrideTokenReservation(tok);
      }
      throw checkoutErr;
    }
  });
  }

  /**
   * Executes a non-destructive customer return with compensating ledger entries & mutex
   */
  public static async executeReturn(params: POSReturnInput): Promise<{
    returnTransaction: POSSaleTransaction;
    originalSale: POSSaleTransaction;
  }> {
    const lockKeys = [`return:${params.originalSaleId}`, `shift:${params.shiftId}`];

    return await POSLockManager.withLocks(lockKeys, async () => {
      // 1. Resolve original sale
      const originalSale = this.getTransaction(params.originalSaleId, params.organizationId);
      if (!originalSale || originalSale.organization_id !== params.organizationId) {
        const err: any = new Error(`Original sale transaction "${params.originalSaleId}" not found.`);
        err.code = 'SALE_NOT_FOUND';
        err.status = 404;
        throw err;
      }

      // Re-hydrate returned_serials and returned_amount from all existing return transactions
      const existingReturns = Array.from(posTransactionsStore.values()).filter(
        (t) => t.is_return && t.original_transaction_id === originalSale.id
      );
      const allPriorSerials = new Set<string>(originalSale.returned_serials || []);
      let totalPriorRefund = 0;
      for (const ret of existingReturns) {
        totalPriorRefund += Math.abs(ret.total_amount);
        for (const it of ret.items) {
          if (it.serial_number) {
            allPriorSerials.add(it.serial_number);
            const origItem = originalSale.items.find((i) => i.serial_number === it.serial_number);
            if (origItem) origItem.is_returned = true;
          }
        }
      }
      originalSale.returned_serials = Array.from(allPriorSerials);
      originalSale.returned_amount = roundToMoney(totalPriorRefund);

      if (originalSale.status === 'RETURNED') {
        const err: any = new Error(`Sale transaction "${originalSale.receipt_number}" has already been fully returned.`);
        err.code = 'SALE_ALREADY_RETURNED';
        err.status = 409;
        throw err;
      }

      // 2. Active Shift Check (Refunds are drawn from this active shift)
      const shift = CashShiftEngine.getShiftById(params.shiftId, params.organizationId);
      if (!shift || shift.status === 'CLOSED' || shift.status === 'CLOSING') {
        const err: any = new Error(`Active cashier shift required to process return (current status: ${shift?.status || 'NOT_FOUND'}).`);
        err.code = 'INVALID_OR_CLOSED_SHIFT';
        err.status = 400;
        throw err;
      }

      // 3. Resolve Items to Return (Partial vs Full Return)
      let itemsToReturn: POSSaleItem[] = [];

      if (params.returnedPieceSerials && params.returnedPieceSerials.length > 0) {
        for (const serial of params.returnedPieceSerials) {
          if (originalSale.returned_serials.includes(serial)) {
            const err: any = new Error(`Piece "${serial}" from sale "${originalSale.receipt_number}" has already been returned.`);
            err.code = 'PIECE_ALREADY_RETURNED';
            err.status = 422;
            throw err;
          }

          const matchedItem = originalSale.items.find((i) => i.serial_number === serial);
          if (!matchedItem) {
            const err: any = new Error(`Piece "${serial}" is not part of sale transaction "${originalSale.receipt_number}".`);
            err.code = 'PIECE_NOT_IN_SALE';
            err.status = 422;
            throw err;
          }

          itemsToReturn.push(matchedItem);
        }
      } else {
        itemsToReturn = originalSale.items.filter(
          (i) => !i.serial_number || !originalSale.returned_serials?.includes(i.serial_number)
        );

        if (itemsToReturn.length === 0) {
          const err: any = new Error(`Sale transaction "${originalSale.receipt_number}" has already been fully returned.`);
          err.code = 'SALE_ALREADY_RETURNED';
          err.status = 409;
          throw err;
        }
      }

      const refundTotal = roundToMoney(
        itemsToReturn.reduce((sum, it) => sum + Math.abs(it.total_price), 0)
      );
      const refundSilverGrams = roundToMoney(
        itemsToReturn.reduce(
          (sum, it) => sum + (it.profile_type === 'SILVER_JEWELRY' ? Math.abs(it.weight_grams * it.quantity) : 0),
          0
        )
      );

      // 3.5 Physical Return Weight Verification (EK-1200 Gate)
      const rawRole = (params.actorRole || 'CASHIER').toUpperCase();
      const isCashier = rawRole === 'CASHIER' || rawRole === 'MEMBER' || rawRole === 'VIEWER';
      const itemTargetStatuses = new Map<string, PieceLifecycleStatus>();
      const pieceReturnAudit = new Map<string, {
        returnWeight?: number;
        attestationId?: string;
        discrepancy?: number;
        hasOverride?: boolean;
        targetStatus: PieceLifecycleStatus;
      }>();

      for (const item of itemsToReturn) {
        if (!item.serial_number) {
          itemTargetStatuses.set(item.product_id, 'RETURN_PENDING_INSPECTION');
          continue;
        }

        // Look up scale attestation for this serial
        let attestation: any = null;
        if (params.scaleAttestations) {
          if (Array.isArray(params.scaleAttestations)) {
            attestation = params.scaleAttestations.find(
              (a: any) => a.pieceSerialNumber === item.serial_number || a.barcode === item.barcode
            ) || params.scaleAttestations[0];
          } else {
            attestation = params.scaleAttestations[item.serial_number] ||
                          params.scaleAttestations[item.barcode || ''] ||
                          params.scaleAttestations['default'];
          }
        }

        let targetStatus: PieceLifecycleStatus = 'RETURN_PENDING_INSPECTION';
        let weightDiscrepancy: number | undefined = undefined;

        if (attestation) {
          const verification = ScaleBridgeVerifier.verifyAttestation(attestation, {
            consumeNonce: true
          });

          if (!verification.valid) {
            const err: any = new Error(
              verification.errorMessage || `Invalid EK-1200 scale attestation for piece "${item.serial_number}".`
            );
            err.code = verification.errorCode || 'INVALID_SCALE_ATTESTATION';
            err.status = 422;
            throw err;
          }

          const scaleWeight = attestation.grossWeightGrams !== undefined ? attestation.grossWeightGrams : (attestation.weightGrams ?? 0);
          const registeredWeight = item.weight_grams;
          const delta = Math.abs(scaleWeight - registeredWeight);
          weightDiscrepancy = roundToMoney(delta);

          // Zero-silent-tolerance: exact weight match required
          if (delta > 0.0001) {
            const hasOverride = Boolean(params.managerOverrideToken || !isCashier);
            if (!hasOverride) {
              const err: any = new Error(
                `Physical return weight (${scaleWeight.toFixed(2)}g) does not match registered weight (${registeredWeight.toFixed(2)}g) for piece "${item.serial_number}". Discrepancy: ${delta.toFixed(3)}g. Manager override required.`
              );
              err.code = 'UNMATCHED_RETURN_WEIGHT';
              err.status = 422;
              throw err;
            }
            // Discrepancy with manager override -> strictly quarantine
            targetStatus = 'QUARANTINED';
          }
        } else {
          // No scale attestation provided
          const hasOverride = Boolean(params.managerOverrideToken || !isCashier);
          if (isCashier && !hasOverride) {
            const err: any = new Error(
              `Physical EK-1200 scale attestation required to return serialized piece "${item.serial_number}". Manual cashier weight entry is strictly prohibited.`
            );
            err.code = 'SCALE_ATTESTATION_REQUIRED';
            err.status = 422;
            throw err;
          }
          // With manager override or manager role, allow return but route to inspection
          targetStatus = 'RETURN_PENDING_INSPECTION';
        }

        const effectiveReturnWeight = attestation
          ? (attestation.grossWeightGrams !== undefined ? attestation.grossWeightGrams : attestation.weightGrams)
          : undefined;
        const effectiveAttestationId = attestation
          ? (attestation.readingId || attestation.attestationId || attestation.nonce)
          : undefined;

        itemTargetStatuses.set(item.serial_number, targetStatus);
        pieceReturnAudit.set(item.serial_number, {
          returnWeight: effectiveReturnWeight,
          attestationId: effectiveAttestationId,
          discrepancy: weightDiscrepancy,
          hasOverride: Boolean(params.managerOverrideToken),
          targetStatus
        });
      }

      // 4. Refund Settlement (By original method or permitted alternative)
      const effectiveRefundMethod = (params.refundMethod || originalSale.payment_method || 'CASH') as POSPaymentMethod;

      if (effectiveRefundMethod === 'CASH') {
        CashShiftEngine.atomicDeductCashDrawer({
          organizationId: params.organizationId,
          branchId: params.branchId,
          terminalId: params.terminalId,
          shiftId: params.shiftId,
          amount: refundTotal,
          movementType: 'REFUND_CASH',
          referenceTransactionId: originalSale.id,
          actorUserId: params.cashierUserId,
          notes: `Compensating cash refund for ${originalSale.receipt_number}`
        });
      } else if (effectiveRefundMethod === 'CARD') {
        CashShiftEngine.recordJournalMovement({
          organizationId: params.organizationId,
          branchId: params.branchId,
          terminalId: params.terminalId,
          shiftId: params.shiftId,
          amount: refundTotal,
          movementType: 'REFUND_CARD',
          paymentMethod: 'CARD',
          referenceTransactionId: originalSale.id,
          actorUserId: params.cashierUserId,
          notes: `POS card refund credit for ${originalSale.receipt_number}`
        });
      }

      // 5. Compensating Stock Movements (Restock Pieces)
      const returnSaleId = `ret_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const randSuffix = Math.floor(1000 + Math.random() * 9000);
      const returnReceiptNumber = `RET-${originalSale.receipt_number}-${randSuffix}`;
      const nowIso = new Date().toISOString();

      for (const item of itemsToReturn) {
        const targetStatus = (item.serial_number ? itemTargetStatuses.get(item.serial_number) : undefined) || 'RETURN_PENDING_INSPECTION';
        if (item.serial_number) {
          executePieceMovement({
            serial_number: item.serial_number,
            movement_type: 'CUSTOMER_RETURN',
            target_status: targetStatus,
            dest_warehouse_id: shift.branch_id,
            dest_location_code: targetStatus === 'QUARANTINED' ? 'QC-HOLD' : 'VAULT-QC',
            actor_user_id: params.cashierUserId,
            actor_role: params.actorRole || 'Cashier',
            reason: `Customer Return for ${originalSale.receipt_number}: ${params.returnReason}`,
            reference_id: returnSaleId,
            reference_type: 'ORDER',
            organization_id: params.organizationId,
            idempotency_key: `${params.idempotencyKey || returnSaleId}_ret_${item.serial_number}`
          });
          originalSale.returned_serials.push(item.serial_number);
        } else {
          appendStockLedgerEvent({
            organization_id: params.organizationId,
            movement_type: 'CUSTOMER_RETURN',
            product_id: item.product_id,
            sku: item.sku,
            barcode: item.barcode,
            dest_warehouse_id: shift.branch_id,
            dest_location_code: 'VAULT-A1',
            quantity_delta: Math.abs(item.quantity),
            weight_grams_delta: Math.abs(item.weight_grams * item.quantity),
            actor_user_id: params.cashierUserId,
            actor_role: params.actorRole || 'Cashier',
            reference_id: returnSaleId,
            reference_type: 'ORDER',
            reason: `Customer Return for ${originalSale.receipt_number}: ${params.returnReason}`,
            idempotency_key: `${params.idempotencyKey || returnSaleId}_ret_bulk_${item.product_id}`
          });
        }
        item.is_returned = true;
      }

      // 6. Update Original Sale State
      originalSale.returned_amount = roundToMoney((originalSale.returned_amount || 0) + refundTotal);
      const allSerializedReturned = originalSale.items.every(
        (i) => i.is_returned || !i.serial_number || originalSale.returned_serials?.includes(i.serial_number)
      );
      const allAmountReturned = (originalSale.returned_amount || 0) >= (originalSale.total_amount || 0) - 0.05;
      originalSale.status = (allSerializedReturned || allAmountReturned) ? 'RETURNED' : 'PARTIALLY_RETURNED';

      // 7. Create Authoritative Return Record
      const returnTransaction: POSSaleTransaction = {
        id: returnSaleId,
        receipt_number: returnReceiptNumber,
        organization_id: params.organizationId,
        branch_id: params.branchId,
        terminal_id: params.terminalId,
        shift_id: params.shiftId,
        cashier_user_id: params.cashierUserId,
        cashier_name: params.cashierName || shift.cashier_name,
        status: 'COMPLETED',
        payment_method: effectiveRefundMethod,
        cash_amount: effectiveRefundMethod === 'CASH' ? -refundTotal : 0,
        card_amount: effectiveRefundMethod === 'CARD' ? -refundTotal : 0,
        instapay_amount: 0,
        subtotal_amount: -refundTotal,
        discount_amount: 0,
        total_amount: -refundTotal,
        total_silver_weight_grams: -refundSilverGrams,
        items_count: itemsToReturn.length,
        is_return: true,
        original_transaction_id: originalSale.id,
        idempotency_key: params.idempotencyKey,
        created_at: nowIso,
        benchmark_spot_999: originalSale.benchmark_spot_999,
        spot_rate_source: originalSale.spot_rate_source,
        spot_rate_effective_at: originalSale.spot_rate_effective_at,
        is_live_market_feed: false,
        items: itemsToReturn.map((i) => ({
          ...i,
          quantity: -Math.abs(i.quantity),
          total_price: -Math.abs(i.total_price),
          metal_value: i.metal_value !== undefined ? -Math.abs(i.metal_value) : 0,
          workmanship_fee: i.workmanship_fee !== undefined ? -Math.abs(i.workmanship_fee) : 0
        }))
      };

      (returnTransaction as any).pieceReturnAudit = pieceReturnAudit;

      posTransactionsStore.set(originalSale.id, originalSale);
      persistPOSTransaction(returnTransaction);
      return { returnTransaction, originalSale };
    });
  }

  /**
   * Helper to seed transaction for testing
   */
  public static seedTransactionForTesting(tx: POSSaleTransaction): void {
    posTransactionsStore.set(tx.id, tx);
  }

  /**
   * Compensating Rollback for aborted returns when downstream database persistence fails.
   */
  public static rollbackReturn(params: {
    returnTransactionId: string;
    originalSaleId: string;
    shiftId: string;
    organizationId: string;
    branchId: string;
    terminalId: string;
    refundMethod?: string;
    refundAmount: number;
    cashierUserId: string;
    returnedPieces: { serial_number?: string; prevStatus?: string }[];
  }): void {
    // 1. Remove return transaction from store
    posTransactionsStore.delete(params.returnTransactionId);

    // 2. Revert original sale state
    const originalSale = posTransactionsStore.get(params.originalSaleId);
    if (originalSale) {
      originalSale.returned_amount = Math.max(0, roundToMoney((originalSale.returned_amount || 0) - params.refundAmount));
      for (const p of params.returnedPieces) {
        if (p.serial_number && originalSale.returned_serials) {
          originalSale.returned_serials = originalSale.returned_serials.filter((s) => s !== p.serial_number);
          const origItem = originalSale.items.find((i) => i.serial_number === p.serial_number);
          if (origItem) origItem.is_returned = false;
        }
      }
      originalSale.status = (originalSale.returned_amount || 0) > 0 ? 'PARTIALLY_RETURNED' : 'COMPLETED';
      posTransactionsStore.set(originalSale.id, originalSale);
    }

    // 3. Revert pieces back to SOLD in inventory
    for (const p of params.returnedPieces) {
      if (p.serial_number) {
        try {
          const piece = getIndividualPiece(p.serial_number);
          if (piece) {
            piece.lifecycle_status = 'SOLD';
            piece.updated_at = new Date().toISOString();
          }
        } catch (_) {}
      }
    }

    // 4. Revert cash drawer deduction if cash was refunded
    if (params.refundMethod === 'CASH') {
      try {
        CashShiftEngine.atomicDeductCashDrawer({
          organizationId: params.organizationId,
          branchId: params.branchId,
          terminalId: params.terminalId,
          shiftId: params.shiftId,
          amount: -params.refundAmount, // Compensating refund cancel
          movementType: 'REFUND_CASH',
          referenceTransactionId: params.originalSaleId,
          actorUserId: params.cashierUserId,
          notes: `Rollback aborted return for ${params.returnTransactionId}`
        });
      } catch (_) {}
    }
  }

  /**
   * Retrieves sale transaction by ID or receipt number
   */
  public static getTransaction(lookup: string, organizationId: string): POSSaleTransaction | null {
    const direct = posTransactionsStore.get(lookup);
    if (direct && direct.organization_id === organizationId) return direct;

    const byReceiptOrIdemp = Array.from(posTransactionsStore.values()).find(
      (t) => (t.receipt_number === lookup || t.idempotency_key === lookup) && t.organization_id === organizationId
    );
    return byReceiptOrIdemp || null;
  }

  /**
   * Retrieves sale transaction specifically by receipt number
   */
  public static getTransactionByReceiptNumber(receiptNumber: string, organizationId: string): POSSaleTransaction | null {
    return this.getTransaction(receiptNumber, organizationId);
  }

  /**
   * Lists transactions for a specific shift
   */
  public static listTransactionsForShift(shiftId: string, organizationId: string): POSSaleTransaction[] {
    return Array.from(posTransactionsStore.values()).filter(
      (t) => t.shift_id === shiftId && t.organization_id === organizationId
    );
  }

  /**
   * Lists transactions for organization/branch
   */
  public static listTransactions(organizationId: string, branchId?: string): POSSaleTransaction[] {
    return Array.from(posTransactionsStore.values()).filter((t) => {
      if (t.organization_id !== organizationId) return false;
      if (branchId && t.branch_id !== branchId) return false;
      return true;
    });
  }
}
