import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { DualLedgerEngine, JournalEntryType } from '@/lib/services/accounting/dualLedgerEngine';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await assertApiAuth(req, {
      requiredPermission: 'account:read',
      actionDescription: 'Query Account Dual Ledger Journal'
    });

    const params = await context.params;
    const accountId = params.id;

    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;

    const journal = DualLedgerEngine.getAccountJournal(accountId, auth.organizationId, limit, offset);
    const balance = DualLedgerEngine.getAccountBalance(accountId, auth.organizationId);

    return NextResponse.json({
      success: true,
      account_id: accountId,
      balance,
      total_entries: journal.total,
      entries: journal.entries
    });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const accountId = params.id;
    const body = await req.json();

    const entryType: JournalEntryType = body.entryType || body.entry_type;
    const isReversal = entryType === 'REVERSAL';

    const auth = await assertApiAuth(req, {
      requiredPermission: isReversal ? 'account:reversal' : 'account:journal:post',
      actionDescription: isReversal ? 'Reverse Account Journal Entry' : 'Post Dual Ledger Movement'
    });

    const entry = DualLedgerEngine.postJournalEntry({
      organizationId: auth.organizationId,
      accountId,
      entryType,
      actor: auth.user,
      cashDelta: body.cashDelta !== undefined ? Number(body.cashDelta) : (body.cash_delta !== undefined ? Number(body.cash_delta) : undefined),
      grossWeightGrams: body.grossWeightGrams !== undefined ? Number(body.grossWeightGrams) : (body.gross_weight_grams !== undefined ? Number(body.gross_weight_grams) : undefined),
      stoneWeightGrams: body.stoneWeightGrams !== undefined ? Number(body.stoneWeightGrams) : (body.stone_weight_grams !== undefined ? Number(body.stone_weight_grams) : undefined),
      purity: body.purity !== undefined ? Number(body.purity) : undefined,
      fineSilver999Delta: body.fineSilver999Delta !== undefined ? Number(body.fineSilver999Delta) : (body.fine_silver_999_delta !== undefined ? Number(body.fine_silver_999_delta) : undefined),
      referenceDocument: body.referenceDocument || body.reference_document,
      notes: body.notes,
      idempotencyKey: body.idempotencyKey || req.headers.get('x-idempotency-key') || undefined,
      reversedEntryId: body.reversedEntryId || body.reversed_entry_id
    });

    const updatedBalance = DualLedgerEngine.getAccountBalance(accountId, auth.organizationId);

    return NextResponse.json({
      success: true,
      entry,
      balance: updatedBalance
    });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}
