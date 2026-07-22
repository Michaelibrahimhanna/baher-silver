import { Money } from '../types/money';

export type AnalyticsEventType =
  | 'view_item'
  | 'add_to_cart'
  | 'begin_checkout'
  | 'apply_coupon'
  | 'purchase';

export interface AnalyticsEventPayloadMap {
  view_item: {
    productId: string;
    productName: string;
    price: Money;
    category?: string;
  };
  add_to_cart: {
    productId: string;
    productName: string;
    quantity: number;
    price: Money;
  };
  begin_checkout: {
    itemCount: number;
    subtotal: Money;
    currency: string;
  };
  apply_coupon: {
    couponCode: string;
    discountAmount: Money;
    success: boolean;
  };
  purchase: {
    orderNumber: string;
    totalAmount: Money;
    itemCount: number;
    paymentMethod: string;
  };
}

export type EventCallback<T extends AnalyticsEventType> = (
  type: T,
  payload: AnalyticsEventPayloadMap[T]
) => void;

class AnalyticsEventBus {
  private listeners: Map<AnalyticsEventType, Set<EventCallback<AnalyticsEventType>>> = new Map();

  constructor() {
    this.subscribeToAll((eventType, payload) => {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[Analytics EventBus] [${eventType}]`, payload);
      }
    });
  }

  subscribe<T extends AnalyticsEventType>(eventType: T, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback as EventCallback<AnalyticsEventType>);

    return () => {
      this.listeners.get(eventType)?.delete(callback as EventCallback<AnalyticsEventType>);
    };
  }

  subscribeToAll(callback: (type: AnalyticsEventType, payload: unknown) => void): () => void {
    const types: AnalyticsEventType[] = ['view_item', 'add_to_cart', 'begin_checkout', 'apply_coupon', 'purchase'];
    const unsubs = types.map(t => this.subscribe(t, (type, payload) => callback(type, payload)));
    return () => unsubs.forEach(unsub => unsub());
  }

  publish<T extends AnalyticsEventType>(eventType: T, payload: AnalyticsEventPayloadMap[T]): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(eventType, payload);
        } catch (err) {
          console.error(`Error handling analytics event ${eventType}:`, err);
        }
      });
    }
  }
}

export const analyticsEventBus = new AnalyticsEventBus();
