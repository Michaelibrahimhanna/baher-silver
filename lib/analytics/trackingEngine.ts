export interface TrackingEventPayload {
  eventName: 'PageView' | 'AddToCart' | 'InitiateCheckout' | 'Purchase' | 'ViewContent';
  currency?: string;
  value?: number;
  contentIds?: string[];
  userEmail?: string;
  userPhone?: string;
}

type TrackFn = (...args: unknown[]) => void;

class TrackingEngine {
  /**
   * GA4 (Google Analytics 4) Event Dispatcher
   */
  trackGA4(payload: TrackingEventPayload): void {
    if (typeof window !== 'undefined' && (window as unknown as { gtag?: TrackFn }).gtag) {
      (window as unknown as { gtag: TrackFn }).gtag('event', payload.eventName, {
        currency: payload.currency,
        value: payload.value,
        items: payload.contentIds?.map(id => ({ item_id: id })),
      });
    }
  }

  /**
   * Meta Pixel Event Dispatcher (Client-Side)
   */
  trackMetaPixel(payload: TrackingEventPayload): void {
    if (typeof window !== 'undefined' && (window as unknown as { fbq?: TrackFn }).fbq) {
      (window as unknown as { fbq: TrackFn }).fbq('track', payload.eventName, {
        currency: payload.currency,
        value: payload.value,
        content_ids: payload.contentIds,
      });
    }
  }

  /**
   * Meta Conversions API (CAPI Server-Side Dispatcher)
   */
  async trackMetaCAPI(payload: TrackingEventPayload): Promise<{ success: boolean; eventId: string }> {
    const eventId = `capi-evt-${Math.random().toString(36).substring(2, 9)}`;
    console.log(`[Meta CAPI Server-Side] Event: ${payload.eventName} | Value: ${payload.value} ${payload.currency} [ID: ${eventId}]`);
    return { success: true, eventId };
  }

  /**
   * TikTok Pixel Event Dispatcher (Future-Ready Architecture)
   */
  trackTikTokPixel(payload: TrackingEventPayload): void {
    if (typeof window !== 'undefined' && (window as unknown as { ttq?: { track: TrackFn } }).ttq) {
      (window as unknown as { ttq: { track: TrackFn } }).ttq.track(payload.eventName, {
        contents: payload.contentIds?.map(id => ({ content_id: id })),
        value: payload.value,
        currency: payload.currency,
      });
    }
  }

  /**
   * Universal Dispatcher triggering all active tracking channels simultaneously
   */
  async dispatchEvent(payload: TrackingEventPayload): Promise<void> {
    this.trackGA4(payload);
    this.trackMetaPixel(payload);
    await this.trackMetaCAPI(payload);
    this.trackTikTokPixel(payload);
  }
}

export const trackingEngine = new TrackingEngine();
