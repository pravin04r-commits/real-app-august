import { isProd } from '../config/env.js';

type Level = 'info' | 'warn' | 'error' | 'debug';

function emit(level: Level, message: string, meta?: Record<string, unknown>) {
  const line = { level, message, time: new Date().toISOString(), ...meta };
  if (isProd) {
    console[level === 'debug' ? 'log' : level](JSON.stringify(line));
    return;
  }
  const badge = { info: '·', warn: '▲', error: '✖', debug: '⋯' }[level];
  console[level === 'debug' ? 'log' : level](`${badge} ${message}`, meta ?? '');
}

export const log = {
  info: (m: string, meta?: Record<string, unknown>) => emit('info', m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => emit('warn', m, meta),
  error: (m: string, meta?: Record<string, unknown>) => emit('error', m, meta),
  debug: (m: string, meta?: Record<string, unknown>) => {
    if (!isProd) emit('debug', m, meta);
  },
};
