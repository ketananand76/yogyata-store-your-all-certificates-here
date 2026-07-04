/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          light: 'var(--color-accent-light, #c084fc)',
          DEFAULT: 'var(--color-accent, #a855f7)',
          dark: 'var(--color-accent-dark, #7e22ce)',
        },
        indian: {
          saffron: '#FF9933',
          emerald: '#128807',
          gold: '#D4AF37',
          marigold: '#F58220',
          peacock: '#005A9C',
        },
        dark: {
          bg: 'var(--color-bg, #0a0a0f)',
          card: 'var(--color-card, #12111d)',
          border: 'var(--color-border, rgba(168, 85, 247, 0.1))',
          text: '#f3f4f6',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'sans-serif'],
        accent: ['Cinzel', 'Playfair Display', 'serif'],
      },
      backgroundImage: {
        'mandala-pattern': "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"80\" height=\"80\" viewBox=\"0 0 80 80\"><path d=\"M40 0l3.8 23.4L63.6 10l-10 23.6L77.2 40l-23.6 3.8 10 23.6-19.8-13.4L40 80l-3.8-23.4L16.4 70l10-23.6L2.8 40l23.6-3.8-10-23.6 19.8 13.4z\" fill=\"%23ffffff\" fill-opacity=\"0.015\" fill-rule=\"evenodd\"/></svg>')",
      }
    },
  },
  plugins: [],
}
