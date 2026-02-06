/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        clinical: {
          bg: '#0a0f1a',
          surface: '#111827',
          border: '#1f2937',
          muted: '#6b7280',
          text: '#e5e7eb',
          heading: '#f9fafb',
          accent: '#14b8a6',
          'accent-dim': '#0d9488',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
        }
      }
    },
  },
  plugins: [],
}
