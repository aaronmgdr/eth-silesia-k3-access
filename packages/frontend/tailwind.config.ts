import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    extend: {
      colors: {
        'light-gray': {
          '100': '#E2E6E9',
        },
        'white': {
          '50': '#F8FAFC',
        },
        'dark-gray': '#1F262E',
        'black': '#000000',
        'purple': '#A1A9D5',
        'blue': {
          '400': '#6F7FD7',
          '600': '#3082B5',
          '700': '#2D3266',
          '800': '#153A51',
        },
      },
      fontFamily: {
        'satoshi': ['Satoshi', 'sans-serif'],
        'ui-sans-serif': ['ui-sans-serif', 'serif'],
        'ui-monospace': ['ui-monospace', 'serif'],
      },
      fontSize: {
        '12': '12px',
        '14': '14px',
        '16': '16px',
        '18': '18px',
        '20': '20px',
        '24': '24px',
        '30': '30px',
        '36': '36px',
        '48': '48px',
        '60': '60px',
      },
      borderRadius: {
        'none': '12px',
        'sm': '9999px',
        'md': '16px',
        'lg': '10px',
      },
      boxShadow: {
        'sm': 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
        'DEFAULT': 'rgba(111, 127, 215, 0.25) 0px 25px 50px -12px',
        'md': 'rgba(111, 127, 215, 0.3) 0px 0px 15px 0px',
        'lg': 'rgba(0, 0, 0, 0.15) 0px 4px 30px 0px',
        'xl': 'rgba(111, 127, 215, 0.4) 0px 8px 50px 0px',
      },
    },
  },
  plugins: [],
};

export default config;
