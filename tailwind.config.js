/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          bg: '#0B1220',
          surface: '#111C31',
          card: '#162238',
          border: '#23334D',
          hover: '#1B2B47',
          muted: '#64748B',
          text: '#E2E8F0',
          cyan: '#22D3EE',
          blue: '#3B82F6',
        },
        status: {
          normal: '#22C55E',
          caution: '#F59E0B',
          critical: '#EF4444',
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'JetBrains Mono', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -3px rgba(34, 211, 238, 0.35)',
        'glow-blue': '0 0 20px -3px rgba(59, 130, 246, 0.35)',
        'glow-red': '0 0 20px -3px rgba(239, 68, 68, 0.45)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
