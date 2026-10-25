/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    // Font sizes are about 20% smaller than Tailwind defaults (site-wide).
    fontSize: {
      xs: ['0.6875rem', { lineHeight: '1rem' }],
      sm: ['0.75rem', { lineHeight: '1.0625rem' }],
      base: ['0.875rem', { lineHeight: '1.375rem' }],
      lg: ['1rem', { lineHeight: '1.5rem' }],
      xl: ['1.125rem', { lineHeight: '1.625rem' }],
      '2xl': ['1.25rem', { lineHeight: '1.75rem' }],
      '3xl': ['1.5rem', { lineHeight: '2rem' }],
      '4xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '5xl': ['2.25rem', { lineHeight: '1' }],
      '6xl': ['2.75rem', { lineHeight: '1' }],
    },
    extend: {
      colors: {
        forest: { DEFAULT: '#1B4D2E', dark: '#12361F', light: '#2A6B43' },
        leaf: { DEFAULT: '#5BA83C', light: '#E6F2DD' },
        paper: '#F8F6F0',
        ink: '#23272A',
        gold: { DEFAULT: '#E3A81C', light: '#FBF0CF' },
        earth: { DEFAULT: '#7A5230', light: '#EFE5DA' },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
