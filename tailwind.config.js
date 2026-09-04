/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        pitch: '#102a43',
        gold: '#facc15',
        ink: '#0f172a',
      },
    },
  },
  plugins: [],
};
