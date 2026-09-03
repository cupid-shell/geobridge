/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        geo: {
          50: '#f4f6fb',
          100: '#e8edf6',
          200: '#cdd9ec',
          300: '#a3bcde',
          500: '#4370ba',
          600: '#2f5597',
          700: '#244277',
          900: '#152442',
        }
      }
    },
  },
  plugins: [],
}

