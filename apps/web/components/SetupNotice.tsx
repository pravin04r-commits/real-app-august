import { missingEnvVars } from '@/lib/env';

/**
 * Shown when the app is deployed but not yet configured.
 * A blank screen or a cryptic network error would send someone hunting; this
 * names the exact variables and where to put them.
 */
export function SetupNotice() {
  const missing = missingEnvVars();

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-12">
      <div className="card border-gold/40 p-7">
        <p className="text-4xl">🔌</p>
        <h1 className="mt-4 font-display text-2xl font-extrabold">Almost live</h1>
        <p className="mt-3 text-sm leading-relaxed text-ash">
          R.E.A.L. is deployed but has not been told where its database is. Add these in
          your hosting dashboard, then redeploy.
        </p>

        <ul className="mt-5 space-y-2">
          {missing.map((name) => (
            <li key={name} className="rounded-lg border border-white/10 bg-slate/50 px-3 py-2 font-mono text-xs text-blush">
              {name}
            </li>
          ))}
        </ul>

        <p className="mt-5 text-xs leading-relaxed text-ash">
          On Vercel: <span className="text-blush">Settings → Environment Variables</span>, then
          <span className="text-blush"> Deployments → Redeploy</span>. Variables are baked in at
          build time, so a redeploy is required — adding them alone changes nothing.
        </p>
      </div>
    </main>
  );
}
