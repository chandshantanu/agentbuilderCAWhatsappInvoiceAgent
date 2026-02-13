/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary, #8B5CF6)',
        secondary: 'var(--color-secondary, #6366F1)',
        background: 'var(--color-background, #FFFFFF)',
        foreground: 'var(--color-text, #1F2937)',
        muted: {
          DEFAULT: 'var(--color-muted, #6B7280)',
          foreground: 'var(--color-muted-foreground, #9CA3AF)',
        },
        border: 'var(--color-border, #E5E7EB)',
        'border-subtle': 'var(--color-border-subtle, #F3F4F6)',
        surface: {
          raised: 'var(--color-surface-raised, #F9FAFB)',
          overlay: 'var(--color-surface-overlay, #FFFFFF)',
        },
        accent: {
          blue: 'var(--color-accent-blue, #3B82F6)',
          green: 'var(--color-accent-green, #10B981)',
          amber: 'var(--color-accent-amber, #F59E0B)',
          rose: 'var(--color-accent-rose, #F43F5E)',
          violet: 'var(--color-accent-violet, #8B5CF6)',
          cyan: 'var(--color-accent-cyan, #06B6D4)',
        },
      },
      fontFamily: {
        sans: ['var(--font-family, Inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'slide-in-up': 'slide-in-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
