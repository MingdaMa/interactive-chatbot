/** @type {import('tailwindcss').Config} */
import formsPlugin from '@tailwindcss/forms'

module.exports = {
  content: ["./public/**/*.{html,js}"],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'),
    formsPlugin
  ],
}

