import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { CashShiftEngine } from '@/lib/services/pos/cashShiftEngine';
import pg from 'pg';

let pgPool: pg.Pool | null = null;
function getPool(): pg.Pool {
  if (!pgPool) {
    const connStr = process.env.DATABASE_URL || 'postgresql://baher_app_user:baher_app_local_2026@127.0.0.1:5432/baher_silver_staging';
    pgPool = new pg.Pool({
      connectionString: connStr,
      connectionTimeoutMillis: 5000,
      max: 10
    });
  }
  return pgPool;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await assertApiAuth(req, {
      actionDescription: 'View Baher Silver Dashboard'
    });

    const isCashier = auth.user.role === 'Cashier';
    const pool = getPool();
    const client = await pool.connect();

    try {
      // 1. Inventory & Pieces
      const itemsRes = await client.query(`
        SELECT 
          COUNT(*)::int as total_pieces,
          COALESCE(SUM(gross_weight_grams), 0)::numeric(12,2) as total_gross_weight,
          COALESCE(SUM(net_silver_weight_grams), 0)::numeric(12,2) as total_net_weight,
          COALESCE(SUM(
            CASE 
              WHEN purity = 999 THEN net_silver_weight_grams * 0.999
              WHEN purity = 950 THEN net_silver_weight_grams * 0.950
              WHEN purity = 925 THEN net_silver_weight_grams * 0.925
              WHEN purity = 900 THEN net_silver_weight_grams * 0.900
              WHEN purity = 800 THEN net_silver_weight_grams * 0.800
              ELSE net_silver_weight_grams * 0.925
            END
          ), 0)::numeric(12,2) as fine_silver_999_grams,
          COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END)::int as available_count,
          COUNT(CASE WHEN status = 'SOLD' THEN 1 END)::int as sold_count,
          COUNT(CASE WHEN status = 'RETURN_PENDING_INSPECTION' THEN 1 END)::int as inspection_count,
          COUNT(CASE WHEN status = 'QUARANTINED' THEN 1 END)::int as quarantined_count
        FROM items;
      `);

      // 2. Sales / Invoices
      const salesRes = await client.query(`
        SELECT 
          COUNT(*)::int as invoice_count,
          COALESCE(SUM(final_total_egp), 0)::numeric(12,2) as total_revenue_egp,
          COALESCE(SUM(CASE WHEN invoice_type = 'RETAIL' OR invoice_type IS NULL THEN final_total_egp ELSE 0 END), 0)::numeric(12,2) as retail_revenue_egp,
          COALESCE(SUM(CASE WHEN invoice_type = 'WHOLESALE' THEN final_total_egp ELSE 0 END), 0)::numeric(12,2) as wholesale_revenue_egp,
          COALESCE(SUM(total_net_silver_weight_grams), 0)::numeric(12,2) as sold_silver_grams
        FROM sales_invoices
        WHERE status != 'CANCELLED';
      `);

      // 3. Traders / Dual Ledger (restricted for cashiers)
      let tradersData: any = {
        active_traders_count: 0,
        trader_cash_balance_egp: '0.00',
        trader_silver_999_balance_grams: '0.00'
      };
      if (!isCashier) {
        const tradersRes = await client.query(`
          SELECT 
            COUNT(*)::int as active_traders_count,
            COALESCE(SUM(b.cash_balance), 0)::numeric(12,2) as trader_cash_balance_egp,
            COALESCE(SUM(b.fine_silver_999_balance_grams), 0)::numeric(12,2) as trader_silver_999_balance_grams
          FROM open_accounts a
          LEFT JOIN account_balances b ON b.account_id = a.id
          WHERE a.is_active = true;
        `);
        if (tradersRes.rows.length > 0) {
          tradersData = tradersRes.rows[0];
        }
      }

      // 4. Returns
      const returnsRes = await client.query(`
        SELECT 
          COUNT(*)::int as return_count,
          COALESCE(SUM(refund_amount_egp), 0)::numeric(12,2) as total_refunded_egp,
          COALESCE(SUM(return_weight_grams), 0)::numeric(12,2) as total_returned_weight_grams
        FROM sales_returns;
      `);

      // 5. Latest Spot Rate
      const rateRes = await client.query(`
        SELECT spot_price_per_gram_egp, base_purity, effective_date
        FROM pricing_reference_rates
        WHERE is_active = true
        ORDER BY effective_date DESC
        LIMIT 1;
      `);

      // 6. Recent Invoices (limit 5)
      const recentRes = await client.query(`
        SELECT 
          id, invoice_number, invoice_date, customer_name, total_items_count,
          final_total_egp, payment_method, status, invoice_type, created_at
        FROM sales_invoices
        ORDER BY created_at DESC
        LIMIT 5;
      `);

      // 7. Active Shift
      let activeShift: any = null;
      try {
        activeShift = CashShiftEngine.getActiveShiftForTerminal(auth.organizationId, 'POS-01');
      } catch {
        // Fallback gracefully if no shift service running
      }

      return NextResponse.json({
        success: true,
        userRole: auth.user.role,
        isCashier,
        telemetry: {
          inventory: {
            totalPieces: Number(itemsRes.rows[0]?.total_pieces || 0),
            totalGrossWeightGrams: Number(itemsRes.rows[0]?.total_gross_weight || 0),
            totalNetWeightGrams: Number(itemsRes.rows[0]?.total_net_weight || 0),
            fineSilver999Grams: Number(itemsRes.rows[0]?.fine_silver_999_grams || 0),
            availablePieces: Number(itemsRes.rows[0]?.available_count || 0),
            soldPieces: Number(itemsRes.rows[0]?.sold_count || 0),
            pendingInspectionPieces: Number(itemsRes.rows[0]?.inspection_count || 0),
            quarantinedPieces: Number(itemsRes.rows[0]?.quarantined_count || 0)
          },
          sales: {
            invoiceCount: Number(salesRes.rows[0]?.invoice_count || 0),
            totalRevenueEgp: Number(salesRes.rows[0]?.total_revenue_egp || 0),
            retailRevenueEgp: Number(salesRes.rows[0]?.retail_revenue_egp || 0),
            wholesaleRevenueEgp: isCashier ? null : Number(salesRes.rows[0]?.wholesale_revenue_egp || 0),
            soldSilverGrams: Number(salesRes.rows[0]?.sold_silver_grams || 0)
          },
          traders: isCashier ? null : {
            activeTradersCount: Number(tradersData.active_traders_count || 0),
            traderCashBalanceEgp: Number(tradersData.trader_cash_balance_egp || 0),
            traderSilver999BalanceGrams: Number(tradersData.trader_silver_999_balance_grams || 0)
          },
          returns: {
            returnCount: Number(returnsRes.rows[0]?.return_count || 0),
            totalRefundedEgp: Number(returnsRes.rows[0]?.total_refunded_egp || 0),
            totalReturnedWeightGrams: Number(returnsRes.rows[0]?.total_returned_weight_grams || 0)
          },
          shift: activeShift ? {
            id: activeShift.id,
            status: activeShift.status,
            terminalId: activeShift.terminal_id,
            openedAt: activeShift.opened_at,
            cashierName: activeShift.cashier_name || 'Cashier',
            openingFloat: activeShift.opening_float,
            currentExpectedCash: activeShift.current_expected_cash
          } : null,
          spotRate: rateRes.rows[0] ? {
            spotPricePerGramEgp: Number(rateRes.rows[0].spot_price_per_gram_egp),
            basePurity: rateRes.rows[0].base_purity,
            effectiveDate: rateRes.rows[0].effective_date
          } : null,
          recentInvoices: recentRes.rows
        }
      });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}
