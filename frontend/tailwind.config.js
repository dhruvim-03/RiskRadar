/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        primary: 'var(--primary)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        'risk-low': 'var(--risk-low)',
        'risk-medium': 'var(--risk-medium)',
        'risk-high': 'var(--risk-high)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '12px',
        lg: '12px',
        md: '8px',
      },
    },
  },
  plugins: [],
}
