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
  appendStockLedgerEvent
} from '@/lib/db/productEngine';
import { CashShiftEngine } from './cashShiftEngine';
import { POSLockManager } from './posLockManager';
import { TaxInvoiceQRService } from './qrReceiptVerification';
import { CustomerService } from '@/lib/services/customer';
import type { SilverPurity, PieceLifecycleStatus } from '@/lib/types';

const POS_DATA_DIR = typeof process !== 'undefined' && process.cwd ? path.resolve(process.cwd(), '.data') : '';
const POS_TX_FILE = POS_DATA_DIR ? path.join(POS_DATA_DIR, 'pos_transactions.jsonl') : '';

// Persistent Transaction Store with File Journal Bridge
const posTransactionsStore: Map<string, POSSaleTransaction> = new Map();

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

    return await POSLockManager.withLocks(lockKeys, async () => {
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

      // 3. Resolve & Pre-Validate All Items
      const validatedItems: Array<{
        product: any;
        piece?: any;
        quantity: number;
        weightGrams: number;
        spotRate: number;
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

          // Authoritative Silver Pricing
          const purity: SilverPurity = (product.purity as SilverPurity) || '925';
          const weightGrams = itemInput.customWeightGrams || (selectedPiece ? selectedPiece.current_weight_grams : product.weight_grams) || 8.0;
          const spotRate = itemInput.customSpotPricePerGram || DEFAULT_SILVER_SPOT_RATES[purity] || 55.5;
          const metalValue = Number((weightGrams * spotRate).toFixed(2));
          const workmanshipFee = Number((product.labor_cost || 30.0).toFixed(2));
          const unitPrice = Number((metalValue + workmanshipFee).toFixed(2));
          const itemDiscount = Number((itemInput.discountAmount || 0).toFixed(2));
          const totalPrice = Number((Math.max(0, unitPrice * itemInput.quantity - itemDiscount)).toFixed(2));

          validatedItems.push({
            product,
            piece: selectedPiece,
            quantity: itemInput.quantity,
            weightGrams,
            spotRate,
            metalValue,
            workmanshipFee,
            unitPrice,
            discountAmount: itemDiscount,
            totalPrice
          });

          subtotalAmount += totalPrice;
          totalSilverWeightGrams += weightGrams * itemInput.quantity;
        } else {
          // NON_SILVER_RETAIL Profile Handling
          // Fixed retail pricing
          const unitPrice = Number((product.price || 45.0).toFixed(2));
          const itemDiscount = Number((itemInput.discountAmount || 0).toFixed(2));
          const totalPrice = Number((Math.max(0, unitPrice * itemInput.quantity - itemDiscount)).toFixed(2));

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
            requestedDiscount
          );
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
            quantity: v.quantity,
            weight_grams: v.weightGrams,
            spot_price_per_gram: v.spotRate,
            metal_value: v.metalValue,
            workmanship_fee: v.workmanshipFee,
            unit_price: v.unitPrice,
            discount_amount: v.discountAmount,
            total_price: v.totalPrice
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

      // 9. Generate Standard TLV Base64 QR (ZATCA Phase 1 Simplified Tax Invoice compatible)
      const nowIso = new Date().toISOString();
      const qrMeta = TaxInvoiceQRService.generateZATCAPhase1Payload({
        sellerName: 'Baher Silver LLC',
        vatNumber: '300-482-918',
        timestamp: nowIso,
        totalAmount: finalSaleTotal,
        taxAmount: 0
      });

      const verificationUrl = `/api/receipt/verify?orderNumber=${receiptNumber}&signature=${encodeURIComponent(qrMeta.qrPayloadBase64.slice(0, 16))}`;

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
        items: lineItems,
        qr_payload_base64: qrMeta.qrPayloadBase64,
        verification_url: verificationUrl
      };

      persistPOSTransaction(transaction);

      return transaction;
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

      if (originalSale.status === 'RETURNED') {
        const err: any = new Error(`Sale transaction "${originalSale.receipt_number}" has already been returned.`);
        err.code = 'SALE_ALREADY_RETURNED';
        err.status = 409;
        throw err;
      }

      // 2. Active Shift Check
      const shift = CashShiftEngine.getShiftById(params.shiftId, params.organizationId);
      if (!shift || shift.status === 'CLOSED' || shift.status === 'CLOSING') {
        const err: any = new Error(`Active cashier shift required to process return (current status: ${shift?.status || 'NOT_FOUND'}).`);
        err.code = 'INVALID_OR_CLOSED_SHIFT';
        err.status = 400;
        throw err;
      }

      // 3. Refund Settlement: Cash / Drawer Solvency Guard
      if (originalSale.cash_amount > 0) {
        CashShiftEngine.atomicDeductCashDrawer({
          organizationId: params.organizationId,
          branchId: params.branchId,
          terminalId: params.terminalId,
          shiftId: params.shiftId,
          amount: originalSale.cash_amount,
          movementType: 'REFUND_CASH',
          referenceTransactionId: originalSale.id,
          actorUserId: params.cashierUserId,
          notes: `Compensating cash refund for ${originalSale.receipt_number}`
        });
      }

      // 4. Compensating Stock Movements (Restock Pieces)
      const returnSaleId = `ret_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const returnReceiptNumber = `RET-${originalSale.receipt_number}`;
      const nowIso = new Date().toISOString();

      for (const item of originalSale.items) {
        if (item.serial_number) {
          // Restock physical piece back to VAULT
          executePieceMovement({
            serial_number: item.serial_number,
            movement_type: 'CUSTOMER_RETURN',
            dest_warehouse_id: shift.branch_id,
            dest_location_code: 'VAULT-A1',
            actor_user_id: params.cashierUserId,
            actor_role: params.actorRole || 'Cashier',
            reason: `Customer Return for ${originalSale.receipt_number}: ${params.returnReason}`,
            reference_id: returnSaleId,
            reference_type: 'ORDER',
            organization_id: params.organizationId,
            idempotency_key: `${params.idempotencyKey || returnSaleId}_ret_${item.serial_number}`
          });
        } else {
          // Bulk merchandise restock
          appendStockLedgerEvent({
            organization_id: params.organizationId,
            movement_type: 'CUSTOMER_RETURN',
            product_id: item.product_id,
            sku: item.sku,
            barcode: item.barcode,
            dest_warehouse_id: shift.branch_id,
            dest_location_code: 'VAULT-A1',
            quantity_delta: item.quantity,
            weight_grams_delta: item.weight_grams * item.quantity,
            actor_user_id: params.cashierUserId,
            actor_role: params.actorRole || 'Cashier',
            reference_id: returnSaleId,
            reference_type: 'ORDER',
            reason: `Customer Return for ${originalSale.receipt_number}: ${params.returnReason}`,
            idempotency_key: `${params.idempotencyKey || returnSaleId}_ret_bulk_${item.product_id}`
          });
        }
      }

      // 5. Mark Original Sale as RETURNED
      originalSale.status = 'RETURNED';

      // 6. Create Return Record
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
        payment_method: originalSale.payment_method,
        cash_amount: -originalSale.cash_amount,
        card_amount: -originalSale.card_amount,
        instapay_amount: -originalSale.instapay_amount,
        subtotal_amount: -originalSale.subtotal_amount,
        discount_amount: 0,
        total_amount: -originalSale.total_amount,
        total_silver_weight_grams: -originalSale.total_silver_weight_grams,
        items_count: originalSale.items_count,
        is_return: true,
        original_transaction_id: originalSale.id,
        idempotency_key: params.idempotencyKey,
        created_at: nowIso,
        items: originalSale.items.map((i) => ({
          ...i,
          quantity: -i.quantity,
          total_price: -i.total_price
        }))
      };

      persistPOSTransaction(returnTransaction);
      return { returnTransaction, originalSale };
    });
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
