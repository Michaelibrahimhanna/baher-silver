/**
 * Baher Silver — Deterministic Daily & Shift Closing (Z-Report) Engine
 * 
 * Enforces:
 *   1. Zero Hallucinations: Derived strictly from Cash Shift and Transaction stores.
 *   2. Strict Silver Purity Accounting: Aggregates silver weight strictly for 925, 900, 950, 999.
 *   3. Dual Profile Reporting: Separates silver jewelry sales from non-silver retail merchandise.
 *   4. Mathematical Cash Reconciliation: Reconciles opening float, sales, refunds, and discrepancy.
 */

import { POSZReport } from './types';
import { CashShiftEngine } from './cashShiftEngine';
import { POSTransactionEngine } from './posTransactionEngine';
import type { SilverPurity } from '@/lib/types';

export class ZReportEngine {
  /**
   * Generates a deterministic Z-Report for a specific cashier shift
   */
  public static generateZReportForShift(params: {
    organizationId: string;
    shiftId: string;
    branchName?: string;
  }): POSZReport {
    const shift = CashShiftEngine.getShiftById(params.shiftId, params.organizationId);
    if (!shift) {
      const err: any = new Error(`Shift "${params.shiftId}" not found.`);
      err.code = 'SHIFT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const transactions = POSTransactionEngine.listTransactionsForShift(params.shiftId, params.organizationId);

    const completedSales = transactions.filter((t) => !t.is_return);
    const returnSales = transactions.filter((t) => t.is_return);

    let silverPiecesSold = 0;
    let silverPiecesReturned = 0;
    let retailPiecesSold = 0;
    let totalSilverGramsSold = 0;
    let totalSilverGramsReturned = 0;

    const silverGramsByPurity: Record<SilverPurity, number> = {
      '925': 0,
      '900': 0,
      '950': 0,
      '999': 0,
      '800': 0
    };

    for (const sale of completedSales) {
      for (const item of sale.items) {
        if (item.profile_type === 'SILVER_JEWELRY') {
          silverPiecesSold += item.quantity;
          const weight = item.weight_grams * item.quantity;
          totalSilverGramsSold += weight;
          const purity: SilverPurity = item.purity || '925';
          if (silverGramsByPurity[purity] !== undefined) {
            silverGramsByPurity[purity] = Number(((silverGramsByPurity[purity] || 0) + weight).toFixed(2));
          }
        } else {
          retailPiecesSold += item.quantity;
        }
      }
    }

    for (const ret of returnSales) {
      for (const item of ret.items) {
        if (item.profile_type === 'SILVER_JEWELRY') {
          const qty = Math.abs(item.quantity);
          const weight = Math.abs(item.weight_grams * qty);
          silverPiecesReturned += qty;
          totalSilverGramsReturned += weight;
          const purity: SilverPurity = item.purity || '925';
          if (silverGramsByPurity[purity] !== undefined) {
            silverGramsByPurity[purity] = Number(((silverGramsByPurity[purity] || 0) - weight).toFixed(2));
          }
        }
      }
    }

    const totalSales = Number(
      (shift.total_cash_sales + shift.total_card_sales + shift.total_instapay_sales).toFixed(2)
    );
    const totalRefunds = Number(shift.total_refunds_cash.toFixed(2));
    const netSales = Number((totalSales - totalRefunds).toFixed(2));

    const dateStr = shift.opened_at.slice(0, 10);
    const reportNumber = `ZREP-${dateStr.replace(/-/g, '')}-${shift.terminal_id}`;

    return {
      report_number: reportNumber,
      organization_id: params.organizationId,
      branch_id: shift.branch_id,
      branch_name: params.branchName || 'Cairo Main Boutique (فرع القاهرة الرئيسي)',
      date: dateStr,
      generated_at: new Date().toISOString(),
      shift_id: shift.id,
      shifts_count: 1,
      cashier_name: shift.cashier_name,
      financials: {
        opening_float: shift.opening_float,
        cash_sales: shift.total_cash_sales,
        card_sales: shift.total_card_sales,
        instapay_sales: shift.total_instapay_sales,
        total_sales: totalSales,
        cash_refunds: shift.total_refunds_cash,
        net_sales: netSales,
        cash_in: shift.total_cash_in,
        cash_out: shift.total_cash_out,
        expenses: shift.total_expenses,
        safe_drops: shift.total_safe_drops || 0,
        expected_closing_cash: shift.expected_closing_cash,
        declared_closing_cash: shift.declared_closing_cash || 0,
        cash_discrepancy: shift.cash_discrepancy || 0
      },
      metrics: {
        sales_transactions_count: completedSales.length,
        returns_count: returnSales.length,
        silver_pieces_sold: silverPiecesSold,
        silver_pieces_returned: silverPiecesReturned,
        net_silver_pieces_sold: silverPiecesSold - silverPiecesReturned,
        retail_pieces_sold: retailPiecesSold,
        total_silver_grams_sold: Number(totalSilverGramsSold.toFixed(2)),
        total_silver_grams_returned: Number(totalSilverGramsReturned.toFixed(2)),
        net_silver_grams_sold: Number((totalSilverGramsSold - totalSilverGramsReturned).toFixed(2)),
        silver_grams_by_purity: silverGramsByPurity
      }
    };
  }
}
