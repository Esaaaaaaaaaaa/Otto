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
          bg: '#f7f8fa',
          surface: '#ffffff',
          border: '#e2e5ea',
          muted: '#7c8494',
          text: '#374151',
          heading: '#111827',
          accent: '#0f766e',
          'accent-dim': '#115e59',
          success: '#059669',
          warning: '#d97706',
          danger: '#dc2626',
        }
      }
    },
  },
  plugins: [],
}
