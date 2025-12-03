/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './styles/**/*.{css}'
  ],
  theme: {
    extend: {},
  },
  plugins: [
    // animation plugin (if installed)
    (function () {
      try {
        return require('tailwindcss-animate')
      } catch (e) {
        return () => {}
      }
    })(),
  ],
}
