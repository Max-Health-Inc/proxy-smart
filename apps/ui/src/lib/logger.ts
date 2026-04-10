type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  data?: unknown;
}

const MAX_BUFFER = 500;
const STORAGE_KEY = 'debug_logs';

declare global {
  interface Window {
    __DEBUG_LOGS__?: LogEntry[];
    __DEBUG_ENABLED__?: boolean;
  }
}

function getBuffer(): LogEntry[] {
  if (!window.__DEBUG_LOGS__) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      window.__DEBUG_LOGS__ = raw ? (JSON.parse(raw) as LogEntry[]) : [];
    } catch {
      window.__DEBUG_LOGS__ = [];
    }
  }
  return window.__DEBUG_LOGS__!;
}

function persist(buffer: LogEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer.slice(-MAX_BUFFER)));
  } catch {
    // ignore quota errors
  }
}

function push(level: LogLevel, msg: string, data?: unknown) {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    msg,
    data,
  };
  const buffer = getBuffer();
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
  persist(buffer);

  // Mirror to console for convenience
   
  (console[level] || console.log)(`[${entry.ts}] [${level}] ${msg}`, data ?? '');
}

export const logger = {
  debug: (msg: string, data?: unknown) => push('debug', msg, data),
  info: (msg: string, data?: unknown) => push('info', msg, data),
  warn: (msg: string, data?: unknown) => push('warn', msg, data),
  error: (msg: string, data?: unknown) => push('error', msg, data),
  getLogs: (): LogEntry[] => [...getBuffer()],
  clear: () => {
    window.__DEBUG_LOGS__ = [];
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore storage errors */ }
  },
  enable: () => { window.__DEBUG_ENABLED__ = true; },
  disable: () => { window.__DEBUG_ENABLED__ = false; },
  enabled: () => window.__DEBUG_ENABLED__ === true,
};

// Auto-enable when ?debug=1 in URL
try {
  const params = new URLSearchParams(window.location.search);
  if (params.get('debug') === '1') {
    window.__DEBUG_ENABLED__ = true;
    logger.info('Debug mode enabled via query param');
  }
} catch { /* ignore errors in SSR or restricted environments */ }

// Global error hooks (can be imported early in main)
export function installGlobalErrorHooks() {
  window.addEventListener('error', (e) => {
    logger.error('window.onerror', { message: e.message, filename: (e as ErrorEvent).filename, lineno: (e as ErrorEvent).lineno, colno: (e as ErrorEvent).colno, error: e.error?.stack || String(e.error) });
  });
  window.addEventListener('unhandledrejection', (e) => {
    logger.error('unhandledrejection', { reason: (e as PromiseRejectionEvent).reason });
  });
}
