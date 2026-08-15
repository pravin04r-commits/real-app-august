import 'dotenv/config';
import { z } from 'zod';

/**
 * Fail loudly at boot rather than mysteriously at request time.
 * Missing config is a deploy problem, not a runtime surprise.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  SUPABASE_URL: z.string().url({ message: 'SUPABASE_URL must be a valid URL' }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'SUPABASE_SERVICE_ROLE_KEY is missing'),
  ANTHROPIC_API_KEY: z.string().optional(),
});

/**
 * @supabase/supabase-js reaches for a native global WebSocket, which only
 * exists from Node 22. On Node 20 the server builds and starts, then dies on
 * the first createClient() call with a stack trace deep inside realtime-js.
 * Check it here instead, where the message can actually say what to do.
 */
const majorNode = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);
if (majorNode < 22) {
  console.error(
    `\n🔴 R.E.A.L. API needs Node 22 or newer — this is Node ${process.versions.node}.\n` +
      `The Supabase client requires a native WebSocket, which Node 20 does not have.\n` +
      `Docker: use the node:22-alpine base image. Locally: nvm install 22 && nvm use 22.\n`
  );
  process.exit(1);
}

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(
    `\n🔴 R.E.A.L. API cannot start — environment is incomplete:\n${issues}\n\n` +
      `Copy apps/api/.env.example to apps/api/.env and fill it in.\n`
  );
  process.exit(1);
}

export const env = parsed.data;

/** Multiple origins allowed, comma separated (preview deploys). */
export const allowedOrigins = env.WEB_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);

export const isProd = env.NODE_ENV === 'production';
export const aiEnabled = Boolean(env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.length > 10);
