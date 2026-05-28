/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          900: '#0d1117',
          800: '#161b22',
          700: '#1f2630',
          600: '#2a313c',
        },
        accent: {
          blue: '#3b82f6',
          green: '#10b981',
          orange: '#f97316',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-6px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        pulseRing: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(59,130,246,0.5)' },
          '50%': { boxShadow: '0 0 0 8px rgba(59,130,246,0)' },
        },
      },
      animation: {
        slideIn: 'slideIn 0.25s ease-out',
        pulseRing: 'pulseRing 1.4s ease-out infinite',
      },
    },
  },
  plugins: [],
};
