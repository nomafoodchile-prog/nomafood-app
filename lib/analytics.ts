type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackAnalyticsEvent(eventName: string, params: AnalyticsParams = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  window.gtag("event", eventName, {
    event_category: "portal_mayorista",
    ...params
  });
}
