import type { Config } from 'tailwindcss';

// Los colores se definen como variables CSS en src/index.css (sección :root).
// Cambia los valores allí para ajustar la paleta de toda la tienda.
const withAlpha = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: withAlpha('canvas'),
        surface: withAlpha('surface'),
        ink: withAlpha('ink'),
        muted: withAlpha('muted'),
        line: withAlpha('line'),
        accent: withAlpha('accent'),
        'accent-ink': withAlpha('accent-ink'),
        'accent-strong': withAlpha('accent-strong'),
        danger: withAlpha('danger'),
        success: withAlpha('success'),
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        shell: '88rem',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'slide-in-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'pop': { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.25)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        'fade-up': 'fade-up 600ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'fade-in': 'fade-in 200ms ease-out both',
        'slide-in-right': 'slide-in-right 320ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'slide-in-left': 'slide-in-left 320ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'scale-in': 'scale-in 240ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'pop': 'pop 360ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
