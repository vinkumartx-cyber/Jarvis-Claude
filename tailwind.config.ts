import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f5ff',
          100: '#e0ebff',
          200: '#c5d9ff',
          300: '#a3c4ff',
          400: '#7ba3ff',
          500: '#4a6aff',
          600: '#3d57ff',
          700: '#2d3fff',
          800: '#1e27cc',
          900: '#161d99',
          950: '#0a0d4a',
        },
        dark: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        accent: {
          cyan: '#06b6d4',
          purple: '#a855f7',
          amber: '#f59e0b',
          emerald: '#10b981',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.1)',
          lighter: 'rgba(255, 255, 255, 0.05)',
        },
      },
      backgroundColor: {
        gradient: 'linear-gradient(135deg, #0a0d4a 0%, #161d99 100%)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass-effect': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          '"Cascadia Code"',
          '"Source Code Pro"',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        safe: 'max(1rem, env(safe-area-inset-bottom))',
      },
      opacity: {
        glass: '0.8',
        'glass-light': '0.9',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'inner-lg': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'glow-primary': '0 0 20px rgba(74, 106, 255, 0.3)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.3)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
        'glass': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave': 'wave 1.5s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'wave': {
          '0%, 100%': { transform: 'scaleY(1)' },
          '25%': { transform: 'scaleY(0.7)' },
          '50%': { transform: 'scaleY(1.2)' },
          '75%': { transform: 'scaleY(0.8)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(74, 106, 255, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(74, 106, 255, 0.5)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      transitionDuration: {
        DEFAULT: '300ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    function ({ addBase, theme }: any) {
      addBase({
        ':root': {
          '--color-primary': theme('colors.primary.500'),
          '--color-accent-cyan': theme('colors.accent.cyan'),
          '--color-accent-purple': theme('colors.accent.purple'),
          '--color-dark-bg': theme('colors.dark.950'),
          '--color-dark-card': theme('colors.dark.900'),
          '--color-dark-border': theme('colors.dark.800'),
          '--scrollbar-width': '8px',
          '--scrollbar-track': theme('colors.dark.900'),
          '--scrollbar-thumb': theme('colors.primary.600'),
          '--scrollbar-thumb-hover': theme('colors.primary.500'),
        },
      });
    },
  ],
}

export default config
