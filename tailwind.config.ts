import type { Config } from "tailwindcss";

/**
 * tailwind.config.ts
 * Aksel Tools custom Tailwind configuration.
 * Extends the default palette with the brand's black/red color system.
 */
const config: Config = {
  // Enable dark mode via class (we always use dark)
  darkMode: ["class"],
  // Files to scan for class names
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // -----------------------------------------------------------------------
      // Brand color palette — Aksel Tools
      // Based on: deep black backgrounds + crimson red accents + white text
      // -----------------------------------------------------------------------
      colors: {
        // Background scale (darkest to darkest-lighter)
        background: {
          DEFAULT: "#0a0a0a",
          secondary: "#111111",
          tertiary: "#1a1a1a",
          card: "#141414",
          hover: "#1f1f1f",
        },
        // Red accent scale (Aksel red)
        aksel: {
          50:  "#fff1f1",
          100: "#ffe4e4",
          200: "#fecdcd",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626", // PRIMARY RED
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          950: "#450a0a",
        },
        // Border colors
        border: {
          DEFAULT: "#2a2a2a",
          accent: "#dc2626",
          subtle: "#1f1f1f",
        },
        // Text colors
        text: {
          primary: "#ffffff",
          secondary: "#a1a1aa",
          muted: "#71717a",
          danger: "#ef4444",
        },
        // shadcn/ui semantic tokens (mapped to our brand)
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      // -----------------------------------------------------------------------
      // Border radius tokens
      // -----------------------------------------------------------------------
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // -----------------------------------------------------------------------
      // Font family — Outfit from Google Fonts
      // -----------------------------------------------------------------------
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      // -----------------------------------------------------------------------
      // Custom animations
      // -----------------------------------------------------------------------
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-red": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(220, 38, 38, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(220, 38, 38, 0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.25s ease-out",
        "slide-in-left": "slide-in-left 0.2s ease-out",
        "pulse-red": "pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      // -----------------------------------------------------------------------
      // Box shadows
      // -----------------------------------------------------------------------
      boxShadow: {
        "aksel-sm": "0 2px 8px rgba(220, 38, 38, 0.15)",
        "aksel-md": "0 4px 24px rgba(220, 38, 38, 0.2)",
        "aksel-lg": "0 8px 40px rgba(220, 38, 38, 0.25)",
        "card": "0 1px 3px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.4)",
        "card-hover": "0 4px 12px rgba(0, 0, 0, 0.6)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
