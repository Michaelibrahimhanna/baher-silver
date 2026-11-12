import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { POSTransactionEngine } from '@/lib/services/pos/posTransactionEngine';
import { isBranchMatch } from '@/lib/services/pos/posDiscountEngine';
import { POSError } from '@/lib/silver-os/posWorkflowEngine';
import { getSilverOSRepository, ensureValidUuid } from '@/lib/silver-os/postgresAdapter';
import crypto from 'node:crypto';
import type { SecurityContext } from '@/lib/silver-os/securityPolicy';
import type {
  SalesInvoice,
  CustomerReceipt,
  FinancialJournalEntry
} from '@/lib/silver-os/posTypes';

export async function POST(req: NextRequest) {
  try {
    const auth = await assertApiAuth(req, {
      requiredPermission: 'pos:sale:create',
      actionDescription: 'Execute POS Sale Checkout'
    });

    const body = await req.json();

    const rawItems = body.items || body.lines;
    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart must contain at least one item' },
        { status: 400 }
      );
    }

    if (!body.shiftId && !body.lines) {
      return NextResponse.json(
        { success: false, error: 'Active shiftId is required for POS checkout' },
        { status: 400 }
      );
    }

    // Enforce server-derived tenant & branch identity
    const sessionBranch = auth.user.branchId;
    if (body.branchId && sessionBranch && !isBranchMatch(sessionBranch, body.branchId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Branch mismatch: Checkout branch "${body.branchId}" does not match authenticated cashier branch "${sessionBranch}".`,
          code: 'BRANCH_MISMATCH'
        },
        { status: 403 }
      );
    }
    const effectiveBranch = sessionBranch || body.branchId || 'branch_cairo_main';
    const effectiveOrgId = auth.organizationId || 'org_baher_silver';
    const repository = getSilverOSRepository();

    const idempotencyKey = body.idempotencyKey || req.headers.get('x-idempotency-key') || undefined;

    // Execute checkout through transaction engine
    const transaction = await POSTransactionEngine.executeCheckout({
      organizationId: effectiveOrgId,
      branchId: effectiveBranch,
      terminalId: body.terminalId || 'POS-01',
      shiftId: body.shiftId || 'shift_auto',
      cashierUserId: auth.user.id,
      cashierName: auth.user.email?.split('@')[0] || 'Cashier',
      actorRole: auth.user.role,
      items: rawItems,
      paymentMethod: body.paymentMethod || 'CASH',
      cashAmount: body.cashAmount || body.cashTendered,
      cardAmount: body.cardAmount,
      instapayAmount: body.instapayAmount,
      discountAmount: body.discountAmount || body.globalDiscount,
      discountReason: body.discountReason,
      managerOverrideToken: body.managerOverrideToken || req.headers.get('x-manager-override-token') || undefined,
      weightOverrideToken: body.weightOverrideToken || req.headers.get('x-weight-override-token') || body.managerOverrideToken || req.headers.get('x-manager-override-token') || undefined,
      customerId: body.customerId || undefined,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      idempotencyKey
    });

    // Mirror to Authoritative Silver OS Data Layer (PostgreSQL or isolated repository)
    const rawRole = String(auth.user.role);
    const userRole = (rawRole === 'Owner' || rawRole === 'Admin' || rawRole === 'OWNER' || rawRole === 'ADMIN')
      ? 'OWNER'
      : (rawRole === 'StoreManager' || rawRole === 'STORE_MANAGER' || rawRole === 'MANAGER')
      ? 'STORE_MANAGER'
      : 'CASHIER';

    const tenantUuid = ensureValidUuid(effectiveOrgId);
    const cashierUserUuid = ensureValidUuid(auth.user.id);
    const invoiceUuid = crypto.randomUUID();

    const securityContext: SecurityContext = {
      user: {
        id: cashierUserUuid,
        tenant_id: tenantUuid,
        username: auth.user.email?.split('@')[0] || 'cashier',
        email: auth.user.email || 'cashier@bahersilver.online',
        full_name: auth.user.name || auth.user.email?.split('@')[0] || 'Cashier',
        role: userRole,
        is_active: true,
        created_at: transaction.created_at,
        updated_at: transaction.created_at
      }
    };

    const invoiceDate = transaction.created_at.split('T')[0];

    // Check for existing persisted invoice under idempotency key
    let salesInvoice: SalesInvoice | null = null;
    if (idempotencyKey) {
      try {
        salesInvoice = await repository.getSalesInvoiceByIdempotencyKey(securityContext, idempotencyKey);
      } catch (_) {}
    }

    let financialJournal: FinancialJournalEntry | undefined = undefined;

    if (!salesInvoice) {
      salesInvoice = {
        id: invoiceUuid,
        tenant_id: tenantUuid,
        invoice_number: transaction.receipt_number,
        invoice_date: invoiceDate,
        customer_name: transaction.customer_name,
        customer_phone: transaction.customer_phone,
        idempotency_key: transaction.idempotency_key || transaction.id,
        request_payload_hash: '',
        total_items_count: transaction.items.length,
        total_gross_weight_grams: transaction.items.reduce((acc, i) => acc + (i.weight_grams || 0), 0),
        total_net_silver_weight_grams: transaction.total_silver_weight_grams || transaction.items.reduce((acc, i) => acc + (i.weight_grams || 0), 0),
        subtotal_egp: transaction.subtotal_amount,
        total_discount_egp: transaction.discount_amount,
        final_total_egp: transaction.total_amount,
        payment_method: (
          transaction.payment_method === 'CARD' ? 'CREDIT_CARD' :
          transaction.payment_method === 'INSTAPAY' ? 'BANK_TRANSFER' :
          transaction.payment_method === 'SPLIT' ? 'MIXED' :
          transaction.payment_method || 'CASH'
        ) as any,
        cash_paid_egp: transaction.cash_amount || transaction.total_amount,
        status: 'COMPLETED',
        lines: transaction.items.map((item, idx) => ({
          id: crypto.randomUUID(),
          invoice_id: invoiceUuid,
          item_id: ensureValidUuid(item.serial_number || item.barcode || item.product_id),
          line_number: idx + 1,
          gross_weight_grams: item.weight_grams || 0,
          stone_weight_grams: 0,
          net_silver_weight_grams: item.weight_grams || 0,
          metal_value_egp: item.metal_value || 0,
          making_charge_egp: item.workmanship_fee || 0,
          other_fees_egp: 0,
          discount_egp: item.discount_amount || 0,
          final_line_total_egp: item.total_price,
          is_returned: false
        })),
        created_by: cashierUserUuid,
        created_at: transaction.created_at,
        updated_at: transaction.created_at
      };

      financialJournal = {
        id: crypto.randomUUID(),
        tenant_id: tenantUuid,
        entry_number: `JRN-${transaction.receipt_number}`,
        entry_type: 'POS_SALE',
        debit_account: transaction.payment_method === 'CASH' ? 'TREASURY_CASH_DRAWER' : 'CARD_RECEIVABLE',
        credit_account: 'SALES_REVENUE_EGP',
        amount_egp: transaction.total_amount,
        reference_id: invoiceUuid,
        created_by: cashierUserUuid,
        created_at: transaction.created_at
      };

      try {
        await repository.saveSalesInvoice(securityContext, salesInvoice);
        await repository.saveFinancialJournal(securityContext, financialJournal);
      } catch (repoErr: any) {
        if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) {
          console.error('[FATAL_PERSISTENCE_ERROR] Failed to persist sales invoice or financial journal:', repoErr.message);
          return NextResponse.json(
            {
              success: false,
              code: 'PERSISTENCE_FAILURE',
              error: `Checkout aborted: database persistence failed (${repoErr.message}). No phantom sale was created.`
            },
            { status: 503 }
          );
        }
        console.warn('[SilverOS] Offline development notice: repository persistence warning:', repoErr.message);
      }
    }

    const customerReceipt: CustomerReceipt = {
      invoiceNumber: transaction.receipt_number,
      tenantCode: 'BAHER',
      tenantNameArabic: 'مصنع باهر سيلفر',
      invoiceDate: invoiceDate,
      cashierName: transaction.cashier_name,
      customerName: transaction.customer_name,
      items: transaction.items.map((it, idx) => ({
        lineNumber: idx + 1,
        barcode: it.barcode || it.sku,
        description: it.product_name,
        purity: Number(it.purity || 925),
        makingCharge: it.workmanship_fee || 0,
        discount: it.discount_amount || 0,
        finalPrice: it.total_price
      })),
      subtotalEgp: transaction.subtotal_amount,
      totalDiscountEgp: transaction.discount_amount,
      finalTotalEgp: transaction.total_amount,
      paymentMethod: transaction.payment_method as any,
      amountPaidEgp: transaction.cash_amount || transaction.total_amount,
      changeDueEgp: Math.max(0, (transaction.cash_amount || transaction.total_amount) - transaction.total_amount),
      verificationQrCode: transaction.qr_payload_base64 || '',
      notice: 'شكراً لزيارتكم مصنع باهر سيلفر.'
    };

    return NextResponse.json({
      success: true,
      transaction,
      salesInvoice,
      customerReceipt,
      financialJournal
    });
  } catch (err: unknown) {
    if (err instanceof POSError) {
      return NextResponse.json(
        {
          success: false,
          code: err.code,
          error: err.message
        },
        { status: err.status }
      );
    }
    const anyErr = err as any;
    if (anyErr && typeof anyErr === 'object' && anyErr.code && anyErr.status) {
      return NextResponse.json(
        {
          success: false,
          code: anyErr.code,
          error: anyErr.message
        },
        { status: anyErr.status }
      );
    }
    return handleApiAuthError(err);
  }
}
