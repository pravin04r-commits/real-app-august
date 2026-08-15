import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { allowedOrigins, env, isProd } from './config/env.js';
import { log } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { api } from './routes/index.js';

const app = express();

// Render / Vercel sit behind a proxy — required for correct rate limiting.
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Same-origin, curl and server-to-server calls have no Origin header.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Vercel preview deploys
      if (!isProd && origin.endsWith('.vercel.app')) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

const generalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Slow down a moment.' } },
});

// AI calls cost real money — tighter budget than everything else.
const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: 'RATE_LIMITED', message: 'The AI needs a breather. Try again shortly.' },
  },
});

app.use('/ai', aiLimiter);
app.use(generalLimiter);

app.get('/health', (_req, res) => {
  res.json({ ok: true, data: { status: 'alive', service: 'real-api', time: new Date().toISOString() } });
});

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    data: {
      name: 'R.E.A.L. API',
      tagline: "Relationships Ex's Artificial Language",
      docs: '/health',
    },
  });
});

app.use(api);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  log.info(`🔴 R.E.A.L. API listening on :${env.PORT}`, {
    env: env.NODE_ENV,
    origins: allowedOrigins,
  });
});

// Render sends SIGTERM on redeploy — finish in-flight requests first.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    log.info(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
