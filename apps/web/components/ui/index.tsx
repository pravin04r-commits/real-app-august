'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

/* ─────────────────────────────────────────────────────────────
   BUTTON
   Copy rule: buttons say what happens, with personality.
   "Hell yeah, we did it 🔥" — never "Submit".
   ───────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'gold' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-real-gradient text-white shadow-glow hover:brightness-110',
  gold: 'bg-gold-gradient text-midnight font-bold shadow-glow-gold hover:brightness-105',
  ghost: 'bg-white/5 text-blush hover:bg-white/10 border border-white/10',
  outline: 'border border-hot-pink/50 text-hot-pink hover:bg-hot-pink/10',
  danger: 'bg-crimson text-white hover:brightness-110',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-[15px]',
  lg: 'px-8 py-4 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold',
        'transition-all duration-200 active:scale-[0.97]',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
});

/* ─────────────────────────────────────────────────────────────
   CARD
   ───────────────────────────────────────────────────────────── */

interface CardProps extends HTMLMotionProps<'div'> {
  glow?: boolean;
  children: ReactNode;
}

export function Card({ glow, className, children, ...props }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn('card p-5', glow && 'shadow-glow border-hot-pink/30', className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   INPUTS
   ───────────────────────────────────────────────────────────── */

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="label mb-2 block">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-hot-pink">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-ash">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn('input', className)} {...props} />;
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn('input min-h-[120px] resize-y', className)} {...props} />;
  }
);

/* ─────────────────────────────────────────────────────────────
   FEEDBACK
   ───────────────────────────────────────────────────────────── */

export function Alert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  const tones = {
    error: 'border-crimson/40 bg-crimson/10 text-blush',
    success: 'border-gold/40 bg-gold/10 text-gold',
    info: 'border-purple/40 bg-purple/10 text-blush',
  };
  return (
    <div role="alert" className={cn('rounded-xl border px-4 py-3 text-sm', tones[tone])}>
      {children}
    </div>
  );
}

export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/12 px-6 py-12 text-center">
      <div className="animate-float text-4xl">{emoji}</div>
      <h3 className="font-display text-xl font-bold">{title}</h3>
      <p className="max-w-xs text-sm leading-relaxed text-ash">{body}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-xl bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_25%,rgba(255,255,255,0.10)_50%,rgba(255,255,255,0.04)_75%)] bg-[length:200%_100%]',
        className
      )}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
   DATA DISPLAY
   ───────────────────────────────────────────────────────────── */

export function Stat({
  label,
  value,
  sub,
  accent = 'pink',
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: 'pink' | 'gold' | 'purple';
}) {
  const accents = {
    pink: 'text-gradient',
    gold: 'text-gold-gradient',
    purple: 'text-purple',
  };
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className={cn('stat-number mt-2', accents[accent])}>{value}</div>
      {sub && <div className="mt-1 text-xs text-ash">{sub}</div>}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-white/8', className)}>
      <motion.div
        className="h-full rounded-full bg-real-gradient"
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
    </div>
  );
}

export function Badge({
  children,
  tone = 'pink',
}: {
  children: ReactNode;
  tone?: 'pink' | 'gold' | 'purple' | 'muted';
}) {
  const tones = {
    pink: 'border-hot-pink/40 bg-hot-pink/12 text-hot-pink',
    gold: 'border-gold/40 bg-gold/12 text-gold',
    purple: 'border-purple/40 bg-purple/15 text-purple',
    muted: 'border-white/12 bg-white/5 text-ash',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide',
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

/** The +N Sparks celebration. Earning should feel like winning. */
export function SparkPop({ amount }: { amount: number }) {
  return (
    <span className="pointer-events-none absolute -top-1 left-1/2 animate-spark-pop select-none font-display text-lg font-extrabold text-gold">
      +{amount} ✨
    </span>
  );
}
