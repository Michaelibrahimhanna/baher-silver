import type { DomainEvent, EventHookFn } from './EventTypes';
import { createClient } from '@/lib/supabase/client';

export class EventDispatcher {
  private static instance: EventDispatcher;
  private listeners: Map<string, EventHookFn[]> = new Map();

  private constructor() {}

  public static getInstance(): EventDispatcher {
    if (!EventDispatcher.instance) {
      EventDispatcher.instance = new EventDispatcher();
    }
    return EventDispatcher.instance;
  }

  public subscribe(eventName: string, handler: EventHookFn): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)?.push(handler);
  }

  public async publish(event: DomainEvent): Promise<void> {
    // 1. Persist to event_store
    try {
      const supabase = createClient();
      await supabase.from('event_store').insert([
        {
          event_id: event.event_id,
          event_name: event.event_name,
          version: event.version,
          correlation_id: event.correlation_id,
          causation_id: event.causation_id,
          actor: event.actor,
          entity_id: event.entity_id,
          payload: event.payload,
          occurred_at: event.occurred_at,
        }
      ]);
    } catch (e) {
      console.error('Failed to persist domain event:', e);
      // Depending on strictness, we might want to throw here, but typically event store failure shouldn't crash the system if we want resilient publishing. We will just log for now.
    }

    // 2. Dispatch to internal listeners
    const handlers = this.listeners.get(event.event_name) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (e) {
        console.error(`Error in event listener for ${event.event_name}:`, e);
      }
    }
  }
}

export const eventDispatcher = EventDispatcher.getInstance();
