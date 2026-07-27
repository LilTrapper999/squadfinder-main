import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        brand: {
          dark: '#0D0F14',
          nav: '#161B22',
          card: '#1A1F2B',
          accent: '#378ADD',
          accentLight: '#B5D4F4',
          muted: '#8B95A5',
        },
      },
    },
  },
  plugins: [],
}
export default config
