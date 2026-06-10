import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// "Midnight Infrastructure" design tokens.
// Near-black navy surfaces, electric cyan primary, restrained violet accent.
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          elevated: "hsl(var(--surface-elevated))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        status: {
          running: "hsl(var(--status-running))",
          stopped: "hsl(var(--status-stopped))",
          creating: "hsl(var(--status-creating))",
          error: "hsl(var(--status-error))",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      maxWidth: {
        dashboard: "1440px",
      },
      keyframes: {
        "highlight-pulse": {
          "0%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.6)" },
          "50%": { boxShadow: "0 0 0 6px hsl(var(--primary) / 0.18)" },
          "100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0)" },
        },
        "status-ping": {
          "0%": { transform: "scale(1)", opacity: "0.7" },
          "75%, 100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        "highlight-pulse": "highlight-pulse 1.3s ease-out 3",
        "status-ping": "status-ping 1.8s cubic-bezier(0,0,0.2,1) infinite",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
