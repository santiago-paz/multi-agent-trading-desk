import { LogEntry, LogStatus } from '../types';
import type { ProgressEventPayload, FetchResult } from '../types';

const RESULT_TO_LOG_STATUS: Record<FetchResult, LogStatus> = {
  ok: 'ok',
  empty: 'warn',
  error: 'error',
};

/**
 * Reducer: given the current log list and a parsed `progress` SSE event,
 * return the next list. If `event.result` is set, finds the latest matching
 * "running" log for the same agent+ticker+status and flips its status in
 * place; otherwise appends a new running log.
 *
 * `nextId` is used when a new row is created.
 */
export function applyProgressEvent(
  logs: LogEntry[],
  event: ProgressEventPayload,
  nextId: string,
): LogEntry[] {
  const agent = event.agent || '';
  const ticker = event.ticker || '';
  const status = event.status || '';
  const detail = event.analysis || status;
  const text = `${agent}${ticker ? ` [${ticker}]` : ''}: ${detail}`;

  if (event.result) {
    for (let i = logs.length - 1; i >= 0; i--) {
      const l = logs[i];
      if (l.agent === agent && l.ticker === ticker && l.detail === status && l.status === 'running') {
        const updated: LogEntry = { ...l, status: RESULT_TO_LOG_STATUS[event.result] };
        return [...logs.slice(0, i), updated, ...logs.slice(i + 1)];
      }
    }
    return [
      ...logs,
      { id: nextId, text, status: RESULT_TO_LOG_STATUS[event.result], agent, ticker, detail: status },
    ];
  }

  // The backend only emits an explicit `result` for fetch steps. Pure analytical
  // steps ("Analyzing fundamentals", "Calculating intrinsic value", …) just
  // arrive as a new status update. Treat the previous running step for the same
  // agent+ticker as implicitly completed when the next one starts, otherwise it
  // stays gray forever even though the work clearly finished.
  const promoted = logs.map(l =>
    l.agent === agent && l.ticker === ticker && l.status === 'running'
      ? { ...l, status: 'ok' as LogStatus }
      : l,
  );

  const isAnalysis = Boolean(event.analysis);
  return [
    ...promoted,
    { id: nextId, text, status: isAnalysis ? 'ok' : 'running', agent, ticker, detail: isAnalysis ? event.analysis! : status, isAnalysis },
  ];
}
