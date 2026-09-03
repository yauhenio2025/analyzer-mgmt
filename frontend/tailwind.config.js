/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom brand colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // "The Analyst" editorial tokens (Layout, Runs, Console only)
        ink: {
          950: '#0b0a09',
          900: '#141311',
          800: '#1e1c19',
          700: '#2a2825',
          600: '#3d3a35',
          500: '#5c5852',
          400: '#847f77',
          300: '#aaa49b',
          200: '#cfc9bf',
          100: '#e6e1d8',
          50: '#f3efe8',
        },
        paper: '#f7f4ee',
        gold: {
          100: '#f4ead0',
          300: '#dcc27c',
          500: '#c2a24a',
          600: '#a5852f',
          700: '#7f6522',
        },
        // Status colors
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Iowan Old Style"', '"Palatino Linotype"', 'Palatino', '"Book Antiqua"', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
