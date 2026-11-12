import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { POSTransactionEngine } from '@/lib/services/pos/posTransactionEngine';
import { getSilverOSRepository, ensureValidUuid } from '@/lib/silver-os/postgresAdapter';
import type { SecurityContext } from '@/lib/silver-os/securityPolicy';
import type { SalesReturnRecord, FinancialJournalEntry } from '@/lib/silver-os/posTypes';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const auth = await assertApiAuth(req, {
      requiredPermission: 'pos:sale:refund',
      actionDescription: 'Execute POS Sale Return'
    });

    const body = await req.json();

    if (!body.originalSaleId) {
      return NextResponse.json(
        { success: false, error: 'originalSaleId is required for return processing' },
        { status: 400 }
      );
    }

    if (!body.shiftId) {
      return NextResponse.json(
        { success: false, error: 'Active shiftId is required to process refund' },
        { status: 400 }
      );
    }

    const result = await POSTransactionEngine.executeReturn({
      organizationId: auth.organizationId,
      branchId: body.branchId || 'branch-cairo',
      terminalId: body.terminalId || 'POS-01',
      shiftId: body.shiftId,
      originalSaleId: body.originalSaleId,
      cashierUserId: auth.user.id,
      cashierName: auth.user.email?.split('@')[0] || 'Cashier',
      actorRole: auth.user.role,
      returnReason: body.returnReason || 'Customer Return',
      returnedPieceSerials: body.returnedPieceSerials,
      refundMethod: body.refundMethod || 'CASH',
      idempotencyKey: body.idempotencyKey || req.headers.get('x-idempotency-key') || undefined,
      scaleAttestations: body.scaleAttestations || (body.scaleAttestation ? [body.scaleAttestation] : undefined),
      managerOverrideToken: body.managerOverrideToken || body.weightOverrideToken,
      overrideReason: body.overrideReason
    });

    // Authoritative PostgreSQL Staging Persistence
    const tenantUuid = ensureValidUuid(auth.organizationId);
    const userUuid = ensureValidUuid(auth.user.id);
    const repository = getSilverOSRepository();
    const securityContext: SecurityContext = {
      user: {
        id: userUuid,
        tenant_id: tenantUuid,
        username: auth.user.email?.split('@')[0] || 'cashier',
        email: auth.user.email || 'cashier@bahersilver.online',
        full_name: auth.user.name || auth.user.email?.split('@')[0] || 'Cashier',
        role: (auth.user.role === 'StoreManager' || auth.user.role === 'STORE_MANAGER') ? 'STORE_MANAGER' : (auth.user.role === 'Owner' || auth.user.role === 'ADMIN') ? 'OWNER' : 'CASHIER',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };

    const returnedItems = result.returnTransaction.items;
    const pieceAuditMap = (result.returnTransaction as any).pieceReturnAudit as Map<string, any> | undefined;
    const journalId = crypto.randomUUID();
    const refundAmount = Math.abs(result.returnTransaction.total_amount);
    const returnRecords: SalesReturnRecord[] = [];

    try {
      await repository.runInTransaction(async (txRepo) => {
        let dbInvoice = await txRepo.getSalesInvoiceByNumber(securityContext, result.originalSale.receipt_number);
        if (!dbInvoice) {
          dbInvoice = await txRepo.getSalesInvoiceById(securityContext, ensureValidUuid(result.originalSale.id));
        }

        const nowIso = new Date().toISOString();
        const baseReturnNumber = result.returnTransaction.receipt_number;

        for (let idx = 0; idx < returnedItems.length; idx++) {
          const it = returnedItems[idx];
          const returnRecordId = crypto.randomUUID();
          const targetPieceUuid = ensureValidUuid(it.serial_number || it.barcode || it.product_id || `piece_${idx}`);
          let resolvedItemId = targetPieceUuid;

          if (dbInvoice && dbInvoice.lines && dbInvoice.lines.length > 0) {
            const matchedLine = dbInvoice.lines.find(
              (l) => l.item_id === targetPieceUuid || l.item_barcode === it.barcode
            );
            if (matchedLine) {
              resolvedItemId = matchedLine.item_id;
              matchedLine.is_returned = true;
              matchedLine.returned_at = nowIso;
              matchedLine.return_id = returnRecordId;
            }
          }

          const auditInfo = pieceAuditMap ? pieceAuditMap.get(it.serial_number || '') : undefined;
          const targetStatus = auditInfo?.targetStatus || 'RETURN_PENDING_INSPECTION';

          const record: SalesReturnRecord = {
            id: returnRecordId,
            tenant_id: tenantUuid,
            return_number: `${baseReturnNumber}-${idx + 1}`,
            invoice_id: dbInvoice ? dbInvoice.id : ensureValidUuid(result.originalSale.id),
            invoice_number: result.originalSale.receipt_number,
            item_id: resolvedItemId,
            item_barcode: it.barcode || '',
            refund_amount_egp: Math.abs(it.total_price),
            payment_method: (
              result.returnTransaction.payment_method === 'CARD' ? 'CREDIT_CARD' :
              result.returnTransaction.payment_method === 'INSTAPAY' ? 'BANK_TRANSFER' :
              result.returnTransaction.payment_method || 'CASH'
            ) as any,
            reason: body.returnReason || 'Customer Return',
            authorized_by_user_id: userUuid,
            idempotency_key: `${body.idempotencyKey || result.returnTransaction.id}_piece_${idx + 1}`,
            request_payload_hash: '',
            journal_entry_id: journalId,
            return_weight_grams: auditInfo?.returnWeight ?? null,
            scale_attestation_id: auditInfo?.attestationId ?? null,
            weight_discrepancy_grams: auditInfo?.discrepancy ?? null,
            manager_override_id: null,
            inspection_status: targetStatus,
            target_status: targetStatus,
            created_at: result.returnTransaction.created_at
          };

          await txRepo.saveSalesReturn(securityContext, record);
          returnRecords.push(record);
        }

        if (dbInvoice) {
          const allLinesReturned = dbInvoice.lines.every((l) => l.is_returned);
          dbInvoice.status = allLinesReturned ? 'REFUNDED' : 'PARTIALLY_RETURNED';
          await txRepo.saveSalesInvoice(securityContext, dbInvoice);
        }

        const returnJournal: FinancialJournalEntry = {
          id: journalId,
          tenant_id: tenantUuid,
          entry_number: `JRN-${baseReturnNumber}`,
          entry_type: 'POS_RETURN',
          debit_account: 'SALES_RETURNS_EGP',
          credit_account: result.returnTransaction.payment_method === 'CARD' ? 'CARD_RECEIVABLE' : 'TREASURY_CASH_DRAWER',
          amount_egp: refundAmount,
          reference_id: returnRecords[0]?.id || journalId,
          created_by: userUuid,
          created_at: result.returnTransaction.created_at
        };

        await txRepo.saveFinancialJournal(securityContext, returnJournal);
      });
    } catch (dbErr: any) {
      console.error('[FATAL_RETURN_PERSISTENCE_FAILURE] Reverting return transaction:', dbErr.message);
      // Coordinate safe rollback: revert in-memory transaction and cash drawer
      POSTransactionEngine.rollbackReturn({
        returnTransactionId: result.returnTransaction.id,
        originalSaleId: result.originalSale.id,
        shiftId: body.shiftId,
        organizationId: auth.organizationId,
        branchId: body.branchId || 'branch-cairo',
        terminalId: body.terminalId || 'POS-01',
        refundMethod: body.refundMethod || 'CASH',
        refundAmount,
        cashierUserId: auth.user.id,
        returnedPieces: returnedItems.map((it) => ({ serial_number: it.serial_number, prevStatus: 'SOLD' }))
      });

      return NextResponse.json(
        {
          success: false,
          code: 'PERSISTENCE_FAILURE',
          error: `Return aborted: database persistence failed (${dbErr.message}). No phantom refund was created.`
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      returnTransaction: result.returnTransaction,
      originalSale: result.originalSale,
      salesReturnRecords: returnRecords,
      salesReturnRecord: returnRecords[0]
    });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}

