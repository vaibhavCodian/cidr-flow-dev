/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
        montserrat: ['Montserrat', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      colors: {
        dark: {
          // Console/Terminal inspired dark theme
          primary: '#0a0a0a',     // Very dark background
          secondary: '#141414',   // Slightly lighter background for cards/elements
          tertiary: '#202020',    // Hover states, subtle elements
          border: '#333333',     // Borders
          text_primary: '#e0e0e0', // Primary text (slightly off-white)
          text_secondary: '#a0a0a0', // Secondary text
          accent_blue: '#3b82f6', // Keep blue accent
          accent_green: '#22c55e', // Keep green accent
        },
        // You can keep or adjust light mode colors here if needed
      },
      // Minimal shadows for dark mode, perhaps use borders more
      boxShadow: {
        'md-dark': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.15)', // Subtler shadow for dark
      },
      // Define min-height for table rows if needed
      minHeight: {
        '10': '2.5rem', // Example: min height for table rows
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};