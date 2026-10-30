/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        neutral: "rgb(var(--neutral) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        purple: "rgb(var(--purple) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        slate: Object.fromEntries([50,100,200,300,400,500,600,700,800,900,950].map(n => [n, `rgb(var(--slate-${n}) / <alpha-value>)`])),
        // App surfaces
        ink: {
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          850: 'rgb(var(--ink-850) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
        },
      },
      boxShadow: {
        card: 'var(--card-shadow)',
        glow: '0 0 0 1px rgba(99,102,241,0.35), 0 8px 30px -8px rgba(99,102,241,0.45)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'toast-in': { from: { opacity: 0, transform: 'translateY(8px) scale(0.98)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        'toast-in': 'toast-in 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};
