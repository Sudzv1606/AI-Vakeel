import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          800: '#1e293b',
          900: '#0f172a',
        },
        gold: {
          400: '#d4a853',
          500: '#c9952b',
          600: '#a67c1a',
        },
        cream: '#faf8f5',
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
        'document': '0 4px 24px -4px rgba(0, 0, 0, 0.1)',
        'legal': '0 2px 12px -2px rgba(212, 168, 83, 0.15), 0 4px 20px -4px rgba(15, 23, 42, 0.08)',
        'gold-glow': '0 0 20px -4px rgba(212, 168, 83, 0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
