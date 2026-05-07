/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx,css}"],
  theme: {
    extend: {
      colors: {
        sifix: {
          bg: "#07080a",
          card: "#0d0f14",
          surface: "#111318",
          border: "#1e2028",
          primary: "#FF6363",
          "primary-dark": "#cc4f4f",
          safe: "#22c55e",
          warn: "#f59e0b",
          danger: "#ef4444",
          critical: "#991b1b",
          muted: "#6b7280",
          text: "#e5e7eb",
        },
      },
      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "monospace"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(255,99,99,0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(255,99,99,0.6)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
}
