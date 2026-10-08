/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { 50: '#fff8e6', 100: '#ffedbf', 200: '#ffdb80', 300: '#ffc840', 400: '#f9b417', 500: '#e89a00', 600: '#c47a00', 700: '#9a5c04', 800: '#7a480a', 900: '#653b0d' },
        leaf: { 400: '#4ade80', 500: '#22a559', 600: '#178044', 700: '#126536' },
        surface: '#f6f7f4',
        ink: { 700: '#232a26', 800: '#181d1a', 900: '#101412' },
      },
      fontFamily: { sans: ['Prompt', 'system-ui', 'sans-serif'] },
      boxShadow: { soft: '0 6px 24px -8px rgba(16,20,18,.18)' },
    },
  },
  plugins: [],
}
