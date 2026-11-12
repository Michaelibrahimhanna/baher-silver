/**
 * Baher Silver — Cash Shift & Till Management Engine
 * 
 * Enforces:
 *   1. Shift Lifecycle: OPEN -> ACTIVE -> CLOSING -> CLOSED
 *   2. Independent Cash Journal: Tracks cash in drawer, card, and InstaPay separately
 *   3. Strict Drawer Solvency: Deductions/refunds fail if drawer cash is insufficient
 *   4. Deterministic Reconciliation: Expected Cash vs Declared Cash calculation
 */

import {
  POSCashShift,
  POSCashJournalEntry,
  POSCashMovementType,
  POSPaymentMethod
} from './types';

// In-Memory Persistent Stores
const globalForShifts = globalThis as unknown as {
  __baherCashShiftsStore?: Map<string, POSCashShift>;
  __baherCashJournalStore?: POSCashJournalEntry[];
};
const cashShiftsStore: Map<string, POSCashShift> =
  globalForShifts.__baherCashShiftsStore || (globalForShifts.__baherCashShiftsStore = new Map());
const cashJournalStore: POSCashJournalEntry[] =
  globalForShifts.__baherCashJournalStore || (globalForShifts.__baherCashJournalStore = []);

// Seed an initial open shift for standard development/demo if empty
function initializeDefaultShift() {
  const defaultShiftId = 'shift_cairo_main_01';
  if (!cashShiftsStore.has(defaultShiftId)) {
    cashShiftsStore.set(defaultShiftId, {
      id: defaultShiftId,
      organization_id: 'org_baher_silver',
      branch_id: 'branch-cairo',
      terminal_id: 'POS-01',
      cashier_user_id: 'usr_cashier_01',
      cashier_name: 'Ahmed Mostafa (Cashier)',
      status: 'ACTIVE',
      opened_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      closed_at: null,
      opening_float: 2500,
      total_cash_sales: 4200,
      total_card_sales: 1800,
      total_instapay_sales: 950,
      total_refunds_cash: 0,
      total_cash_in: 0,
      total_cash_out: 0,
      total_expenses: 0,
      total_safe_drops: 0,
      expected_closing_cash: 6700,
      declared_closing_cash: null,
      cash_discrepancy: null
    });

    cashJournalStore.push({
      id: `cash_init_float`,
      organization_id: 'org_baher_silver',
      branch_id: 'branch-cairo',
      terminal_id: 'POS-01',
      shift_id: defaultShiftId,
      movement_type: 'OPENING_FLOAT',
      payment_method: 'CASH',
      amount: 2500,
      is_cash_in_drawer: true,
      actor_user_id: 'usr_cashier_01',
      notes: 'Initial opening drawer float',
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    });
  }
}

initializeDefaultShift();

export class CashShiftEngine {
  /**
   * Opens a new cashier shift with an opening float
   */
  public static openShift(params: {
    organizationId: string;
    branchId: string;
    terminalId: string;
    cashierUserId: string;
    cashierName?: string;
    openingFloat: number;
  }): POSCashShift {
    // Check if terminal already has an active or open shift
    const existing = Array.from(cashShiftsStore.values()).find(
      (s) =>
        s.organization_id === params.organizationId &&
        s.terminal_id === params.terminalId &&
        (s.status === 'OPEN' || s.status === 'ACTIVE')
    );

    if (existing) {
      const err: any = new Error(
        `ACTIVE_SHIFT_EXISTS: Terminal "${params.terminalId}" already has an active shift (${existing.id}) opened by "${existing.cashier_name}".`
      );
      err.code = 'ACTIVE_SHIFT_EXISTS';
      err.status = 409;
      throw err;
    }

    const shiftId = `shift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const floatAmount = Number(params.openingFloat.toFixed(2));

    const shift: POSCashShift = {
      id: shiftId,
      organization_id: params.organizationId,
      branch_id: params.branchId,
      terminal_id: params.terminalId,
      cashier_user_id: params.cashierUserId,
      cashier_name: params.cashierName || 'Cashier',
      status: 'OPEN',
      opened_at: new Date().toISOString(),
      closed_at: null,
      opening_float: floatAmount,
      total_cash_sales: 0,
      total_card_sales: 0,
      total_instapay_sales: 0,
      total_refunds_cash: 0,
      total_cash_in: 0,
      total_cash_out: 0,
      total_expenses: 0,
      total_safe_drops: 0,
      expected_closing_cash: floatAmount,
      declared_closing_cash: null,
      cash_discrepancy: null
    };

    cashShiftsStore.set(shiftId, shift);

    // Record float in journal
    cashJournalStore.push({
      id: `cj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organization_id: params.organizationId,
      branch_id: params.branchId,
      terminal_id: params.terminalId,
      shift_id: shiftId,
      movement_type: 'OPENING_FLOAT',
      payment_method: 'CASH',
      amount: floatAmount,
      is_cash_in_drawer: true,
      actor_user_id: params.cashierUserId,
      notes: `Shift opened with float ${floatAmount} EGP`,
      created_at: new Date().toISOString()
    });

    return shift;
  }

  /**
   * Retrieves current active shift for terminal
   */
  public static getActiveShiftForTerminal(
    organizationId: string,
    terminalId: string
  ): POSCashShift | null {
    const shift = Array.from(cashShiftsStore.values()).find(
      (s) =>
        s.organization_id === organizationId &&
        s.terminal_id === terminalId &&
        (s.status === 'OPEN' || s.status === 'ACTIVE')
    );
    return shift || null;
  }

  /**
   * Retrieves shift by ID
   */
  public static getShiftById(
    shiftId: string,
    organizationId: string
  ): POSCashShift | null {
    const s = cashShiftsStore.get(shiftId);
    if (!s || s.organization_id !== organizationId) return null;
    return s;
  }

  /**
   * Internal helper to detect cross-tenant access attempts.
   */
  public static findShiftByIdAnyTenant(shiftId: string): POSCashShift | null {
    return cashShiftsStore.get(shiftId) || null;
  }

  /**
   * Records movement in cash journal and updates shift running totals
   */
  public static recordJournalMovement(params: {
    organizationId: string;
    branchId: string;
    terminalId?: string;
    shiftId: string;
    movementType: POSCashMovementType;
    paymentMethod: POSPaymentMethod;
    amount: number;
    referenceTransactionId?: string;
    actorUserId: string;
    notes?: string;
    idempotencyKey?: string;
  }): POSCashJournalEntry {
    const shift = cashShiftsStore.get(params.shiftId);
    if (!shift || shift.organization_id !== params.organizationId) {
      const err: any = new Error(`Shift "${params.shiftId}" not found.`);
      err.code = 'SHIFT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (shift.status === 'CLOSED' || shift.status === 'CLOSING') {
      const err: any = new Error(`INVALID_OPERATION: Cannot post movements to a ${shift.status} shift (${params.shiftId}).`);
      err.code = 'SHIFT_CLOSED_OR_CLOSING';
      err.status = 400;
      throw err;
    }

    // Idempotency / Replay Guard
    if (params.idempotencyKey) {
      const existing = cashJournalStore.find(
        (e) => e.organization_id === params.organizationId && e.idempotency_key === params.idempotencyKey
      );
      if (existing) {
        return existing;
      }
    }

    const isCash = params.paymentMethod === 'CASH';
    const entryAmount = Number(params.amount.toFixed(2));

    const entry: POSCashJournalEntry = {
      id: `cj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organization_id: params.organizationId,
      branch_id: params.branchId,
      terminal_id: params.terminalId || shift.terminal_id,
      shift_id: params.shiftId,
      movement_type: params.movementType,
      payment_method: params.paymentMethod,
      amount: entryAmount,
      is_cash_in_drawer: isCash,
      reference_transaction_id: params.referenceTransactionId,
      actor_user_id: params.actorUserId,
      notes: params.notes,
      idempotency_key: params.idempotencyKey,
      created_at: new Date().toISOString()
    };

    cashJournalStore.push(entry);

    if (shift.status === 'OPEN') {
      shift.status = 'ACTIVE';
    }

    if (params.movementType === 'SALE_CASH') {
      shift.total_cash_sales = Number((shift.total_cash_sales + entryAmount).toFixed(2));
      shift.expected_closing_cash = Number((shift.expected_closing_cash + entryAmount).toFixed(2));
    } else if (params.movementType === 'SALE_CARD') {
      shift.total_card_sales = Number((shift.total_card_sales + entryAmount).toFixed(2));
    } else if (params.movementType === 'SALE_INSTAPAY') {
      shift.total_instapay_sales = Number((shift.total_instapay_sales + entryAmount).toFixed(2));
    } else if (params.movementType === 'REFUND_CASH') {
      shift.total_refunds_cash = Number((shift.total_refunds_cash + entryAmount).toFixed(2));
      shift.expected_closing_cash = Number((shift.expected_closing_cash - entryAmount).toFixed(2));
    } else if (params.movementType === 'CASH_IN') {
      shift.total_cash_in = Number((shift.total_cash_in + entryAmount).toFixed(2));
      shift.expected_closing_cash = Number((shift.expected_closing_cash + entryAmount).toFixed(2));
    } else if (params.movementType === 'CASH_OUT') {
      shift.total_cash_out = Number((shift.total_cash_out + entryAmount).toFixed(2));
      shift.expected_closing_cash = Number((shift.expected_closing_cash - entryAmount).toFixed(2));
    } else if (params.movementType === 'EXPENSE') {
      shift.total_expenses = Number((shift.total_expenses + entryAmount).toFixed(2));
      if (isCash) {
        shift.expected_closing_cash = Number((shift.expected_closing_cash - entryAmount).toFixed(2));
      }
    } else if (params.movementType === 'SAFE_DROP') {
      shift.total_safe_drops = Number(((shift.total_safe_drops || 0) + entryAmount).toFixed(2));
      shift.expected_closing_cash = Number((shift.expected_closing_cash - entryAmount).toFixed(2));
    }

    return entry;
  }

  /**
   * Initiates shift closing process (transitions ACTIVE/OPEN -> CLOSING)
   */
  public static initiateShiftClose(params: {
    organizationId: string;
    shiftId: string;
    cashierUserId: string;
  }): POSCashShift {
    const shift = cashShiftsStore.get(params.shiftId);
    if (!shift || shift.organization_id !== params.organizationId) {
      const err: any = new Error(`Shift "${params.shiftId}" not found.`);
      err.code = 'SHIFT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (shift.status === 'CLOSED') {
      const err: any = new Error(`Shift "${params.shiftId}" is already CLOSED.`);
      err.code = 'SHIFT_ALREADY_CLOSED';
      err.status = 409;
      throw err;
    }

    shift.status = 'CLOSING';
    return shift;
  }

  /**
   * Atomically verifies drawer solvency and deducts cash for payouts/refunds
   */
  public static atomicDeductCashDrawer(params: {
    organizationId: string;
    branchId: string;
    terminalId?: string;
    shiftId: string;
    amount: number;
    movementType: POSCashMovementType;
    referenceTransactionId?: string;
    actorUserId: string;
    notes?: string;
    idempotencyKey?: string;
  }): POSCashJournalEntry {
    const shift = cashShiftsStore.get(params.shiftId);
    if (!shift || shift.organization_id !== params.organizationId) {
      const err: any = new Error(`Shift "${params.shiftId}" not found.`);
      err.code = 'SHIFT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (shift.status === 'CLOSED' || shift.status === 'CLOSING') {
      const err: any = new Error(`INVALID_OPERATION: Cannot post movements to a ${shift.status} shift (${params.shiftId}).`);
      err.code = 'SHIFT_CLOSED_OR_CLOSING';
      err.status = 400;
      throw err;
    }

    // Idempotency check before solvency check
    if (params.idempotencyKey) {
      const existing = cashJournalStore.find(
        (e) => e.organization_id === params.organizationId && e.idempotency_key === params.idempotencyKey
      );
      if (existing) {
        return existing;
      }
    }

    const deductAmount = Number(params.amount.toFixed(2));

    // Strict Drawer Solvency Guard
    if (shift.expected_closing_cash < deductAmount) {
      const err: any = new Error(
        `INSUFFICIENT_DRAWER_CASH: Cash drawer has ${shift.expected_closing_cash} EGP available, but ${deductAmount} EGP required for payout/refund.`
      );
      err.code = 'INSUFFICIENT_DRAWER_CASH';
      err.status = 400;
      throw err;
    }

    return this.recordJournalMovement({
      organizationId: params.organizationId,
      branchId: params.branchId,
      terminalId: params.terminalId,
      shiftId: params.shiftId,
      movementType: params.movementType,
      paymentMethod: 'CASH',
      amount: deductAmount,
      referenceTransactionId: params.referenceTransactionId,
      actorUserId: params.actorUserId,
      notes: params.notes,
      idempotencyKey: params.idempotencyKey
    });
  }

  /**
   * Closes a shift with declared cash reconciliation and discrepancy calculation
   */
  public static closeShift(params: {
    organizationId: string;
    shiftId: string;
    declaredClosingCash: number;
    closedByUserId: string;
    closingNotes?: string;
  }): { shift: POSCashShift; expectedCash: number; declaredCash: number; discrepancy: number } {
    const shift = cashShiftsStore.get(params.shiftId);
    if (!shift || shift.organization_id !== params.organizationId) {
      const err: any = new Error(`Shift "${params.shiftId}" not found.`);
      err.code = 'SHIFT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (shift.status === 'CLOSED') {
      const err: any = new Error(`Shift "${params.shiftId}" is already closed.`);
      err.code = 'SHIFT_ALREADY_CLOSED';
      err.status = 409;
      throw err;
    }

    const declaredCash = Number(params.declaredClosingCash.toFixed(2));
    const expectedCash = shift.expected_closing_cash;
    const discrepancy = Number((declaredCash - expectedCash).toFixed(2));

    // Record closing declaration in cash journal
    cashJournalStore.push({
      id: `cj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organization_id: params.organizationId,
      branch_id: shift.branch_id,
      terminal_id: shift.terminal_id,
      shift_id: shift.id,
      movement_type: 'CLOSING_DECLARATION',
      payment_method: 'CASH',
      amount: declaredCash,
      is_cash_in_drawer: true,
      actor_user_id: params.closedByUserId,
      notes: `Shift close declaration. Expected: ${expectedCash}, Declared: ${declaredCash}, Discrepancy: ${discrepancy}`,
      created_at: new Date().toISOString()
    });

    shift.status = 'CLOSED';
    shift.closed_at = new Date().toISOString();
    shift.declared_closing_cash = declaredCash;
    shift.cash_discrepancy = discrepancy;
    shift.closed_by_user_id = params.closedByUserId;
    shift.closing_notes = params.closingNotes || '';

    return {
      shift,
      expectedCash,
      declaredCash,
      discrepancy
    };
  }

  /**
   * Lists journal entries for shift
   */
  public static listJournalEntries(shiftId: string, organizationId: string): POSCashJournalEntry[] {
    return cashJournalStore.filter(
      (e) => e.shift_id === shiftId && e.organization_id === organizationId
    );
  }

  /**
   * Mathematically audits and verifies shift accounting balance:
   * Expected = Opening Float + Cash Sales + Cash In - Cash Refunds - Cash Out - Cash Expenses
   */
  public static verifyShiftAccounting(
    shiftId: string,
    organizationId: string
  ): {
    isBalanced: boolean;
    computedExpectedCash: number;
    runningExpectedCash: number;
    discrepancyWithRunning: number;
    journalEntriesCount: number;
  } {
    const shift = cashShiftsStore.get(shiftId);
    if (!shift || shift.organization_id !== organizationId) {
      const err: any = new Error(`Shift "${shiftId}" not found.`);
      err.code = 'SHIFT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const entries = cashJournalStore.filter(
      (e) => e.shift_id === shiftId && e.organization_id === organizationId
    );

    const computedExpected = Number(
      (
        shift.opening_float +
        shift.total_cash_sales +
        shift.total_cash_in -
        shift.total_refunds_cash -
        shift.total_cash_out -
        shift.total_expenses
      ).toFixed(2)
    );

    const diff = Number(Math.abs(computedExpected - shift.expected_closing_cash).toFixed(2));

    return {
      isBalanced: diff === 0,
      computedExpectedCash: computedExpected,
      runningExpectedCash: shift.expected_closing_cash,
      discrepancyWithRunning: diff,
      journalEntriesCount: entries.length
    };
  }
}
