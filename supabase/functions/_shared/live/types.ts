export type LiveConnectorId = "golf_news" | "weather" | "eliteetee_internal";

export type LiveRecord = {
  source_name: string;
  source_url: string;
  fetched_at: string;
  published_at: string | null;
  title: string;
  summary: string;
  category: string;
};

export interface LiveDataConnector {
  id: LiveConnectorId;
  enabled: boolean;
  fetch(): Promise<LiveRecord[]>;
}

/** Phase 1: external live connectors remain disabled until licensed providers are configured. */
export const DISABLED_LIVE_CONNECTORS: LiveConnectorId[] = ["golf_news", "weather"];

export function isLiveConnectorEnabled(id: LiveConnectorId): boolean {
  return !DISABLED_LIVE_CONNECTORS.includes(id);
}
