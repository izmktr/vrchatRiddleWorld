/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        vrchat: {
          primary: '#1A1B23',
          secondary: '#FF6B35',
          accent: '#00D4FF',
          dark: '#0F0F0F',
          light: '#F5F5F5',
        }
      }
    },
  },
  plugins: [],
}
