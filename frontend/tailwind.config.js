/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'langur-green': '#10B981',
        'langur-blue': '#3B82F6',
      },
      animation: {
        'dice-roll': 'spin 0.5s ease-in-out',
      }
    },
  },
  plugins: [],
}