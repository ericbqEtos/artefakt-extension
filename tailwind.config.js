/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,html}', './entrypoints/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // High-contrast accessible palette
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#3b82f6',
          600: '#2563eb',  // 4.5:1 contrast on white
          700: '#1d4ed8',
          800: '#1e40af',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          500: '#737373',
          600: '#525252',  // 7:1 contrast on white
          700: '#404040',
          800: '#262626',
          900: '#171717',
        }
      }
    },
  },
  plugins: [],
}
