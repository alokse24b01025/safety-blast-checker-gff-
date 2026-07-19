/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mining: {
          dark: 'var(--bg)',
          card: 'var(--panel)',
          accent: 'var(--orange)',
          border: 'var(--border)',
          gold: 'var(--orange)',
          green: 'var(--green)',
          red: 'var(--red)',
          orange: 'var(--orange)'
        }
      }
    },
  },
  plugins: [],
}