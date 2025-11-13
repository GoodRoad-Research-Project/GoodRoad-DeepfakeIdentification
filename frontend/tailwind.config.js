/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  darkMode: 'class', // <--- CRITICAL LINE. Make sure this is added!
  theme: {
    extend: {
      // ... your existing theme settings ...
    },
  },
  plugins: [],
};