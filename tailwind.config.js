/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Dark mode removed — light mode only
  theme: {
    extend: {
      colors: {
        primary:    'var(--color-primary, #166534)',
        secondary:  'var(--color-secondary, #92400e)',
        background: 'var(--color-background, #fafaf8)',
        foreground: 'var(--color-text, #1c1917)',
        surface: {
          DEFAULT: 'var(--color-surface, #ffffff)',
          raised:  'var(--color-surface-raised, #f5f3f0)',
          overlay: 'var(--color-surface-overlay, #ede9e3)',
        },
        muted: {
          DEFAULT:    'var(--color-muted, #57534e)',
          foreground: 'var(--color-muted-foreground, #a8a29e)',
        },
        border:         'var(--color-border, #e7e2d9)',
        'border-subtle': 'var(--color-border-subtle, #f0ece6)',
        accent: {
          green:  'var(--color-accent-green,  #16a34a)',
          amber:  'var(--color-accent-amber,  #d97706)',
          red:    'var(--color-accent-red,    #dc2626)',
          blue:   'var(--color-accent-blue,   #2563eb)',
          violet: 'var(--color-accent-violet, #7c3aed)',
        },
        /* Legacy glass palette — kept so existing components don't break,
           maps to warm surface tones instead of dark glass */
        glass: {
          '4':  'rgba(28,25,23,0.04)',
          '5':  'rgba(28,25,23,0.05)',
          '6':  'rgba(28,25,23,0.06)',
          '8':  'rgba(28,25,23,0.08)',
          '10': 'rgba(28,25,23,0.10)',
          '12': 'rgba(28,25,23,0.12)',
          '15': 'rgba(28,25,23,0.15)',
        },
      },
      fontFamily: {
        sans:    ['Outfit', 'system-ui', 'sans-serif'],
        display: ['DM Serif Display', 'Georgia', 'serif'],
        mono:    ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      boxShadow: {
        xs:   'var(--shadow-xs)',
        sm:   'var(--shadow-sm)',
        md:   'var(--shadow-md)',
        lg:   'var(--shadow-lg)',
        card: 'var(--shadow-card)',
        /* Legacy names mapped to warm equivalents */
        'glow-primary': '0 0 0 3px rgba(22,101,52,0.15)',
        'glow-green':   '0 0 0 3px rgba(22,163,74,0.15)',
        'glow-amber':   '0 0 0 3px rgba(217,119,6,0.15)',
        'glow-rose':    '0 0 0 3px rgba(220,38,38,0.15)',
        'glow-cyan':    '0 0 0 3px rgba(37,99,235,0.15)',
        'glass-card':   'var(--shadow-card)',
        'glass-card-hover': 'var(--shadow-md)',
      },
      borderRadius: {
        xl:  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      animation: {
        'fade-in':       'fade-in 0.25s ease-out',
        'slide-in-left': 'slide-in-left 0.25s ease-out',
        'slide-in-up':   'slide-in-up 0.25s ease-out',
        shimmer:         'shimmer 3s linear infinite',
      },
    },
  },
  plugins: [],
};
