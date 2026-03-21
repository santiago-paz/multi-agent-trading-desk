'use server';

import { getApiLogs, clearApiLogs, type ApiLogEntry } from '@/lib/api-logger';

export async function fetchApiLogs(): Promise<ApiLogEntry[]> {
  return getApiLogs();
}

export async function clearAllApiLogs(): Promise<void> {
  clearApiLogs();
}
