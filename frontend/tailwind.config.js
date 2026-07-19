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
          accent: 'var(--yellow)',
          border: 'var(--border)',
          gold: 'var(--yellow)',
          green: 'var(--green)',
          red: 'var(--red)',
          orange: 'var(--orange)'
        }
      }
    },
  },
  plugins: [],
}
