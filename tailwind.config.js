/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:    'var(--color-primary, #A78BFA)',
        secondary:  'var(--color-secondary, #818CF8)',
        background: 'var(--color-background, #070B14)',
        foreground: 'var(--color-text, #E2E8F0)',
        muted: {
          DEFAULT:    'var(--color-muted, #94A3B8)',
          foreground: 'var(--color-muted-foreground, #64748B)',
        },
        border:         'var(--color-border, rgba(255,255,255,0.08))',
        'border-subtle': 'var(--color-border-subtle, rgba(255,255,255,0.04))',
        surface: {
          raised:  'var(--color-surface-raised, rgba(255,255,255,0.04))',
          overlay: 'var(--color-surface-overlay, rgba(255,255,255,0.07))',
        },
        accent: {
          blue:   'var(--color-accent-blue,   #60A5FA)',
          green:  'var(--color-accent-green,  #34D399)',
          amber:  'var(--color-accent-amber,  #FBBF24)',
          rose:   'var(--color-accent-rose,   #FB7185)',
          violet: 'var(--color-accent-violet, #A78BFA)',
          cyan:   'var(--color-accent-cyan,   #22D3EE)',
          pink:   'var(--color-accent-pink,   #F472B6)',
        },
        /* Glass utility palette — used as bg-glass-5, border-glass-8, etc. */
        glass: {
          '4':  'rgba(255,255,255,0.04)',
          '5':  'rgba(255,255,255,0.05)',
          '6':  'rgba(255,255,255,0.06)',
          '8':  'rgba(255,255,255,0.08)',
          '10': 'rgba(255,255,255,0.10)',
          '12': 'rgba(255,255,255,0.12)',
          '15': 'rgba(255,255,255,0.15)',
        },
      },
      fontFamily: {
        sans: ['var(--font-family, Inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        xs:  'var(--shadow-xs)',
        sm:  'var(--shadow-sm)',
        md:  'var(--shadow-md)',
        lg:  'var(--shadow-lg)',
        'glow-primary': 'var(--glow-primary)',
        'glow-green':   'var(--glow-green)',
        'glow-cyan':    'var(--glow-cyan)',
        'glow-rose':    'var(--glow-rose)',
        'glow-amber':   'var(--glow-amber)',
        /* Inline glow helpers */
        'glow-violet-sm': '0 0 12px rgba(167,139,250,0.4)',
        'glow-violet-md': '0 0 24px rgba(167,139,250,0.5), 0 0 48px rgba(167,139,250,0.2)',
        'glow-cyan-sm':   '0 0 12px rgba(34,211,238,0.4)',
        'glow-green-sm':  '0 0 12px rgba(52,211,153,0.4)',
        'glow-rose-sm':   '0 0 12px rgba(251,113,133,0.4)',
        'glow-amber-sm':  '0 0 12px rgba(251,191,36,0.4)',
        'glass-card':
          '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-card-hover':
          '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      backdropBlur: {
        '2xs': '4px',
        xs:    '8px',
        sm:    '12px',
        DEFAULT: '16px',
        md:    '20px',
        lg:    '24px',
        xl:    '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      borderRadius: {
        xl:  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      backgroundImage: {
        /* Aurora blobs */
        'aurora-purple': 'radial-gradient(ellipse at center, rgba(139,92,246,0.5) 0%, transparent 70%)',
        'aurora-blue':   'radial-gradient(ellipse at center, rgba(59,130,246,0.4) 0%, transparent 70%)',
        'aurora-pink':   'radial-gradient(ellipse at center, rgba(236,72,153,0.35) 0%, transparent 70%)',
        'aurora-cyan':   'radial-gradient(ellipse at center, rgba(34,211,238,0.3) 0%, transparent 70%)',
        /* Card gradients */
        'gradient-violet': 'linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(129,140,248,0.06) 100%)',
        'gradient-cyan':   'linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(96,165,250,0.06) 100%)',
        'gradient-green':  'linear-gradient(135deg, rgba(52,211,153,0.15) 0%, rgba(34,211,238,0.06) 100%)',
        'gradient-rose':   'linear-gradient(135deg, rgba(251,113,133,0.15) 0%, rgba(251,191,36,0.06) 100%)',
        /* Primary gradient */
        'gradient-primary': 'linear-gradient(135deg, #A78BFA 0%, #22D3EE 100%)',
        'gradient-warm':    'linear-gradient(135deg, #F472B6 0%, #A78BFA 50%, #60A5FA 100%)',
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
        aurora: {
          '0%':   { transform: 'translate(0%,0%) scale(1)',    opacity: '0.5' },
          '33%':  { transform: 'translate(5%,-8%) scale(1.1)', opacity: '0.7' },
          '66%':  { transform: 'translate(-4%,6%) scale(0.95)', opacity: '0.55' },
          '100%': { transform: 'translate(0%,0%) scale(1)',    opacity: '0.5' },
        },
        'aurora-slow': {
          '0%':   { transform: 'translate(0%,0%) scale(1.1)',   opacity: '0.4' },
          '50%':  { transform: 'translate(-6%,4%) scale(0.95)', opacity: '0.6' },
          '100%': { transform: 'translate(0%,0%) scale(1.1)',   opacity: '0.4' },
        },
        'aurora-drift': {
          '0%':   { transform: 'translate(0%,0%) scale(1)',     opacity: '0.35' },
          '40%':  { transform: 'translate(8%,-5%) scale(1.05)', opacity: '0.5' },
          '80%':  { transform: 'translate(-3%,7%) scale(0.97)', opacity: '0.4' },
          '100%': { transform: 'translate(0%,0%) scale(1)',     opacity: '0.35' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(167,139,250,0.3)' },
          '50%':       { boxShadow: '0 0 20px rgba(167,139,250,0.6), 0 0 40px rgba(167,139,250,0.2)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      animation: {
        'fade-in':      'fade-in 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'slide-in-up':  'slide-in-up 0.3s ease-out',
        aurora:         'aurora 14s ease-in-out infinite',
        'aurora-slow':  'aurora-slow 20s ease-in-out infinite',
        'aurora-drift': 'aurora-drift 18s ease-in-out infinite',
        'pulse-glow':   'pulse-glow 2.5s ease-in-out infinite',
        shimmer:        'shimmer 3s linear infinite',
      },
    },
  },
  plugins: [],
};
