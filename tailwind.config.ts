import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './store/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['var(--font-body)', 'DM Sans', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Fraunces', 'Georgia', 'serif'],
        cjk: ['PingFang SC', 'Noto Sans SC', 'Microsoft YaHei', 'sans-serif'],
      },
      colors: {
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        muted: 'var(--color-muted)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        accent: 'var(--accent)',
      },
      boxShadow: {
        glow: '0 0 60px var(--glow)',
        lift: '0 18px 60px rgba(0, 0, 0, 0.28)',
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        400: '400ms',
      },
    },
  },
  plugins: [animate],
}

export default config
