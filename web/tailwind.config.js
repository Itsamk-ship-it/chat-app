/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          base:    '#0D1117',
          subtle:  '#161B22',
          inset:   '#010409',
          overlay: '#1C2128',
        },
        fg: {
          DEFAULT: '#E6EDF3',
          muted:   '#7D8590',
          subtle:  '#6E7681',
        },
        border: {
          DEFAULT: '#30363D',
          muted:   '#21262D',
        },
        accent: {
          DEFAULT: '#6366F1',
          hover:   '#4F46E5',
          muted:   '#1a1b4b',
          subtle:  '#0f1030',
        },
        success: {
          DEFAULT: '#3FB950',
          muted:   '#1b3d2a',
        },
        danger: {
          DEFAULT: '#F85149',
          muted:   '#3b1a1a',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'scale-up': {
          from: { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
          to:   { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        bounce3: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        'fade-in':  'fade-in 0.15s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'scale-up': 'scale-up 0.18s ease-out',
        'slide-in': 'slide-in 0.15s ease-out',
        bounce3:    'bounce3 1s infinite',
      },
    },
  },
  plugins: [],
};
