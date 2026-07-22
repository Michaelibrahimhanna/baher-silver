import { OrderAggregate, OrderStatus, OrderStateTransition } from '../types/orderAggregate';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  Draft: ['Pending', 'Cancelled'],
  Pending: ['Paid', 'Cancelled'],
  Paid: ['Processing', 'Refunded', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered', 'Cancelled'],
  Delivered: ['Refunded'],
  Cancelled: [],
  Refunded: [],
};

let sequentialOrderCounter = 1;

class OrderStateMachineService {
  /**
   * Generates business order number (BS-2026-000001)
   */
  generateBusinessOrderNumber(): string {
    const year = new Date().getFullYear();
    const padded = String(sequentialOrderCounter++).padStart(6, '0');
    return `BS-${year}-${padded}`;
  }

  canTransition(fromState: OrderStatus, toState: OrderStatus): boolean {
    return VALID_TRANSITIONS[fromState]?.includes(toState) ?? false;
  }

  transitionOrder(
    order: OrderAggregate,
    toState: OrderStatus,
    actor: string,
    reason?: string,
    metadata?: Record<string, unknown>
  ): OrderAggregate {
    if (!this.canTransition(order.status, toState)) {
      throw new Error(`Invalid order state transition from '${order.status}' to '${toState}'.`);
    }

    const transitionRecord: OrderStateTransition = {
      id: `tr-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      fromState: order.status,
      toState,
      actor,
      reason,
      metadata,
    };

    return {
      ...order,
      status: toState,
      stateHistory: [...order.stateHistory, transitionRecord],
      updatedAt: new Date().toISOString(),
    };
  }
}

export const orderStateMachine = new OrderStateMachineService();
