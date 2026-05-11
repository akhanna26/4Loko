/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Source Serif 4"', '"Source Serif Pro"', 'Georgia', 'serif'],
      },
      colors: {
        cream: {
          DEFAULT: '#f5f1e6',
          deep: '#ede6d3',
        },
        forest: {
          DEFAULT: '#1d3a2c',
          deep: '#0f2419',
          moss: '#4a6b53',
          sage: '#8ba896',
        },
        masters: '#fdb515',
        ink: '#1a1a1a',
      },
      letterSpacing: {
        'wider-pro': '0.18em',
        'widest-pro': '0.24em',
      },
    },
  },
  plugins: [],
};

