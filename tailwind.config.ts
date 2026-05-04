import type { Config } from 'tailwindcss'

const cssVar = (name: string) => `var(--color-${name})`

export default {
  content: [
    './app/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
    './app.vue',
    './server/**/*.ts'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  cssVar('primary-50'),
          100: cssVar('primary-100'),
          200: cssVar('primary-200'),
          300: cssVar('primary-300'),
          400: cssVar('primary-400'),
          500: cssVar('primary-500'),
          600: cssVar('primary-600'),
          700: cssVar('primary-700'),
          800: cssVar('primary-800'),
          900: cssVar('primary-900'),
          950: cssVar('primary-950'),
          DEFAULT: cssVar('primary-500')
        },
        neutral: {
          50:  cssVar('neutral-50'),
          100: cssVar('neutral-100'),
          200: cssVar('neutral-200'),
          300: cssVar('neutral-300'),
          400: cssVar('neutral-400'),
          500: cssVar('neutral-500'),
          600: cssVar('neutral-600'),
          700: cssVar('neutral-700'),
          800: cssVar('neutral-800'),
          900: cssVar('neutral-900'),
          950: cssVar('neutral-950')
        },
        gold: {
          100: cssVar('gold-100'),
          400: cssVar('gold-400'),
          500: cssVar('gold-500'),
          600: cssVar('gold-600')
        },
        success: cssVar('success'),
        danger:  cssVar('danger'),
        warning: cssVar('warning'),
        info:    cssVar('info'),
        'market-up':      cssVar('market-up'),
        'market-up-bg':   cssVar('market-up-bg'),
        'market-down':    cssVar('market-down'),
        'market-down-bg': cssVar('market-down-bg'),
        'market-flat':    cssVar('market-flat'),
        // Semantic aliases
        bg:      cssVar('bg'),
        surface: cssVar('surface'),
        'surface-alt': cssVar('surface-alt'),
        text:    cssVar('text'),
        'text-muted': cssVar('text-muted'),
        border:  cssVar('border'),
        brand:   cssVar('brand')
      },
      fontFamily: {
        sans:  ['var(--font-sans)'],
        serif: ['var(--font-serif)'],
        mono:  ['var(--font-mono)']
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)'
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        glow: 'var(--shadow-glow)'
      }
    }
  },
  plugins: []
} satisfies Config
