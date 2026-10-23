import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { DualLedgerEngine, AccountType } from '@/lib/services/accounting/dualLedgerEngine';

export async function GET(req: NextRequest) {
  try {
    const auth = await assertApiAuth(req, {
      requiredPermission: 'account:read',
      actionDescription: 'List Open Accounts and Dual Balances'
    });

    const accounts = (DualLedgerEngine as any).loadAccounts
      ? (DualLedgerEngine as any).loadAccounts().filter((a: any) => a.organization_id === auth.organizationId)
      : [];

    const accountsWithBalances = accounts.map((acc: any) => {
      const balance = DualLedgerEngine.getAccountBalance(acc.id, auth.organizationId);
      return {
        ...acc,
        balance
      };
    });

    return NextResponse.json({
      success: true,
      count: accountsWithBalances.length,
      accounts: accountsWithBalances
    });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await assertApiAuth(req, {
      requiredPermission: 'account:journal:post',
      actionDescription: 'Create Workshop/Merchant Open Account'
    });

    const body = await req.json();

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ success: false, error: 'Account name is required' }, { status: 400 });
    }

    const accountType: AccountType = body.accountType || body.account_type || 'WORKSHOP';

    const account = DualLedgerEngine.createAccount({
      organizationId: auth.organizationId,
      name: body.name.trim(),
      accountType,
      currency: body.currency || 'EGP',
      phone: body.phone,
      notes: body.notes,
      actor: auth.user
    });

    // If opening balance requested, post opening journal entry
    if (body.openingCashBalance || body.openingFineSilverGrams) {
      DualLedgerEngine.postJournalEntry({
        organizationId: auth.organizationId,
        accountId: account.id,
        entryType: 'OPENING_BALANCE',
        actor: auth.user,
        cashDelta: Number(body.openingCashBalance || 0),
        fineSilver999Delta: Number(body.openingFineSilverGrams || 0),
        notes: 'Initial opening balance'
      });
    }

    const balance = DualLedgerEngine.getAccountBalance(account.id, auth.organizationId);

    return NextResponse.json({
      success: true,
      account: {
        ...account,
        balance
      }
    });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}
