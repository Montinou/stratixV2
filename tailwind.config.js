/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
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
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
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
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-in-from-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-from-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-to-left": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
        "slide-out-to-right": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "scale-out": {
          from: { transform: "scale(1)", opacity: "1" },
          to: { transform: "scale(0.95)", opacity: "0" },
        },
        "progress-flow": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in var(--animation-duration-normal, 300ms) var(--animation-ease-in-out, cubic-bezier(0.4, 0, 0.2, 1))",
        "fade-out": "fade-out var(--animation-duration-normal, 300ms) var(--animation-ease-in-out, cubic-bezier(0.4, 0, 0.2, 1))",
        "slide-in-from-left": "slide-in-from-left var(--animation-duration-normal, 300ms) var(--animation-ease-in-out, cubic-bezier(0.4, 0, 0.2, 1))",
        "slide-in-from-right": "slide-in-from-right var(--animation-duration-normal, 300ms) var(--animation-ease-in-out, cubic-bezier(0.4, 0, 0.2, 1))",
        "slide-out-to-left": "slide-out-to-left var(--animation-duration-normal, 300ms) var(--animation-ease-in-out, cubic-bezier(0.4, 0, 0.2, 1))",
        "slide-out-to-right": "slide-out-to-right var(--animation-duration-normal, 300ms) var(--animation-ease-in-out, cubic-bezier(0.4, 0, 0.2, 1))",
        "scale-in": "scale-in var(--animation-duration-fast, 150ms) var(--animation-ease-in-out, cubic-bezier(0.4, 0, 0.2, 1))",
        "scale-out": "scale-out var(--animation-duration-fast, 150ms) var(--animation-ease-in-out, cubic-bezier(0.4, 0, 0.2, 1))",
        "progress-flow": "progress-flow 2s ease-in-out infinite",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        "bounce-subtle": "bounce-subtle 1s ease-in-out infinite",
        "shimmer": "shimmer 2s ease-in-out infinite",
      },
      transitionTimingFunction: {
        "ease-spring": "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "ease-smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
        "ease-in-smooth": "cubic-bezier(0.4, 0, 1, 1)",
        "ease-out-smooth": "cubic-bezier(0, 0, 0.2, 1)",
      },
      transitionDuration: {
        "75": "75ms",
        "250": "250ms",
        "400": "400ms",
        "600": "600ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}