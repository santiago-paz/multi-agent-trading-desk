/**
 * Centralized API call logger.
 * Records request/response pairs in memory so they can be surfaced in the UI.
 * Server-side only (runs in Node.js process).
 *
 * Uses globalThis to ensure a single shared store across all Next.js server
 * action bundles (each file can get its own module instance, so module-level
 * variables are NOT shared between e.g. trading/actions.ts and api-explorer/log-actions.ts).
 */

export interface ApiLogEntry {
  id: number;
  timestamp: string;
  source: 'IOL' | 'Yahoo' | 'LLM' | 'Other';
  method: string;
  endpoint: string;
  requestBody?: unknown;
  responseBody?: unknown;
  status: number | null;
  error?: string;
  durationMs: number;
}

interface ApiLogStore {
  entries: ApiLogEntry[];
  counter: number;
}

const MAX_ENTRIES = 200;
const GLOBAL_KEY = '__api_log_store__';

function getStore(): ApiLogStore {
  if (!(globalThis as any)[GLOBAL_KEY]) {
    (globalThis as any)[GLOBAL_KEY] = { entries: [], counter: 0 };
  }
  return (globalThis as any)[GLOBAL_KEY];
}

export function logApiCall(entry: Omit<ApiLogEntry, 'id' | 'timestamp'>): ApiLogEntry {
  const store = getStore();
  const full: ApiLogEntry = {
    ...entry,
    id: store.counter++,
    timestamp: new Date().toISOString(),
  };
  store.entries.unshift(full);
  if (store.entries.length > MAX_ENTRIES) store.entries = store.entries.slice(0, MAX_ENTRIES);
  return full;
}

export function getApiLogs(): ApiLogEntry[] {
  return getStore().entries;
}

export function clearApiLogs(): void {
  getStore().entries = [];
}
