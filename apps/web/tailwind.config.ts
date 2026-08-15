import type { Config } from 'tailwindcss';

/**
 * R.E.A.L. design tokens.
 * Crimson, hot pink, gold, electric purple on midnight.
 * Never a corporate white-and-blue palette.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Tailwind's default opacity scale skips these; the design system
      // leans on very low-alpha borders and fills, so add them explicitly.
      opacity: {
        8: '0.08',
        12: '0.12',
        15: '0.15',
        18: '0.18',
        22: '0.22',
        35: '0.35',
        45: '0.45',
        55: '0.55',
        65: '0.65',
        85: '0.85',
      },
      colors: {
        crimson: '#C0153A',
        'hot-pink': '#FF2D6B',
        gold: '#FFD700',
        purple: '#7B2FBE',
        midnight: '#080810',
        charcoal: '#13131F',
        slate: '#1C1C2B',
        blush: '#FFE3ED',
        ash: '#8A8AA3',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'real-gradient': 'linear-gradient(135deg, #FF2D6B 0%, #7B2FBE 100%)',
        'gold-gradient': 'linear-gradient(135deg, #FFD700 0%, #FF2D6B 100%)',
        'midnight-glow':
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,45,107,0.22), transparent 70%)',
      },
      boxShadow: {
        glow: '0 0 32px -8px rgba(255,45,107,0.55)',
        'glow-gold': '0 0 32px -8px rgba(255,215,0,0.5)',
        lift: '0 18px 40px -20px rgba(0,0,0,0.9)',
      },
      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.13)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.09)' },
          '70%': { transform: 'scale(1)' },
        },
        'spark-pop': {
          '0%': { transform: 'translateY(0) scale(0.6)', opacity: '0' },
          '35%': { transform: 'translateY(-14px) scale(1.15)', opacity: '1' },
          '100%': { transform: 'translateY(-34px) scale(0.85)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        heartbeat: 'heartbeat 2.2s ease-in-out infinite',
        'spark-pop': 'spark-pop 1s ease-out forwards',
        shimmer: 'shimmer 2.5s linear infinite',
        'fade-up': 'fade-up 0.45s ease-out both',
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
