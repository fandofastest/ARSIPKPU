/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        kpu: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        brand: {
          red: '#dc2626',
          gold: '#d97706',
          dark: '#0f172a',
          cardDark: '#18181b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(220, 38, 38, 0.15)',
        'glow-lg': '0 0 35px rgba(220, 38, 38, 0.25)',
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'card-dark': '0 4px 25px -2px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
