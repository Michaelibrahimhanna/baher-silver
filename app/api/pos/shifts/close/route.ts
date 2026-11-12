import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { CashShiftEngine } from '@/lib/services/pos/cashShiftEngine';
import { ZReportEngine } from '@/lib/services/pos/zReportEngine';
import { getSilverOSRepository, ensureValidUuid } from '@/lib/silver-os/postgresAdapter';
import type { SecurityContext } from '@/lib/silver-os/securityPolicy';
import type { FinancialJournalEntry } from '@/lib/silver-os/posTypes';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const auth = await assertApiAuth(req, {
      requiredPermission: 'pos:shift:close',
      actionDescription: 'Close Cash Shift and Reconcile Till'
    });

    const body = await req.json();

    if (!body.shiftId) {
      return NextResponse.json(
        { success: false, error: 'shiftId is required to close shift' },
        { status: 400 }
      );
    }

    if (body.declaredClosingCash === undefined || body.declaredClosingCash < 0) {
      return NextResponse.json(
        { success: false, error: 'Valid declaredClosingCash count is required' },
        { status: 400 }
      );
    }

    const reconciliation = CashShiftEngine.closeShift({
      organizationId: auth.organizationId,
      shiftId: body.shiftId,
      declaredClosingCash: Number(body.declaredClosingCash),
      closedByUserId: auth.user.id,
      closingNotes: body.closingNotes
    });

    // Automatically generate final closing Z-Report
    const zReport = ZReportEngine.generateZReportForShift({
      organizationId: auth.organizationId,
      shiftId: body.shiftId
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

    // 1. Shift Closing Cash Journal Entry
    const closingJournal: FinancialJournalEntry = {
      id: crypto.randomUUID(),
      tenant_id: tenantUuid,
      entry_number: `JRN-Z-${zReport.report_number}`,
      entry_type: 'ADJUSTMENT',
      debit_account: 'TREASURY_SAFE_DEPOSIT',
      credit_account: 'TREASURY_CASH_DRAWER',
      amount_egp: reconciliation.declaredCash,
      reference_id: ensureValidUuid(body.shiftId),
      created_by: userUuid,
      created_at: new Date().toISOString()
    };

    let discrepancyJournal: FinancialJournalEntry | undefined = undefined;

    // 2. Discrepancy Journal Entry (if any variance)
    if (reconciliation.discrepancy !== 0) {
      const isShortage = reconciliation.discrepancy < 0;
      discrepancyJournal = {
        id: crypto.randomUUID(),
        tenant_id: tenantUuid,
        entry_number: `JRN-DISC-${zReport.report_number}`,
        entry_type: 'ADJUSTMENT',
        debit_account: isShortage ? 'CASH_DISCREPANCY_SHORTAGE_EXPENSE' : 'TREASURY_CASH_DRAWER',
        credit_account: isShortage ? 'TREASURY_CASH_DRAWER' : 'CASH_DISCREPANCY_OVERAGE_INCOME',
        amount_egp: Math.abs(reconciliation.discrepancy),
        reference_id: ensureValidUuid(body.shiftId),
        created_by: userUuid,
        created_at: new Date().toISOString()
      };
    }

    try {
      await repository.saveFinancialJournal(securityContext, closingJournal);
      if (discrepancyJournal) {
        await repository.saveFinancialJournal(securityContext, discrepancyJournal);
      }
    } catch (dbErr: any) {
      console.warn('[SilverOS] Shift closing journal persistence warning:', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      reconciliation,
      zReport,
      closingJournal,
      discrepancyJournal
    });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}

