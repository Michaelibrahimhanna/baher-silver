export interface DomainEvent<T = unknown> {
  event_id: string;
  event_name: string;
  version: number;
  correlation_id?: string;
  causation_id?: string;
  occurred_at: string;
  actor?: string;
  entity_id: string;
  payload: T;
}

export type EventHookFn = (event: DomainEvent) => void | Promise<void>;
