/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx,css}"],
  theme: {
    extend: {
      colors: {
        sifix: {
          // Premium dark canvas
          bg: "#0a0118",
          card: "#1a1625",
          surface: "#2d1b4e",
          border: "rgba(248, 247, 255, 0.06)",
          // Brand palette
          primary: "#8b5cf6",       // violet-500
          "primary-light": "#a78bfa",
          "primary-dark": "#6d28d9",
          accent: "#ec4899",        // pink-500
          indigo: "#6366f1",
          cyan: "#06b6d4",
          // Semantic
          safe: "#22c55e",
          warn: "#f59e0b",
          danger: "#ef4444",
          critical: "#991b1b",
          // Text
          text: "#f8f7ff",
          "text-70": "rgba(248, 247, 255, 0.7)",
          "text-60": "rgba(248, 247, 255, 0.6)",
          "text-40": "rgba(248, 247, 255, 0.4)",
          muted: "rgba(248, 247, 255, 0.5)",
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', "serif"],
        body: ['"DM Sans"', "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"Geist Mono"', "monospace"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        resend:
          "rgba(139, 92, 246, 0.04) 0px 0px 0px 1px, rgba(10, 1, 24, 0.04) 0px 1px 1px -0.5px, rgba(10, 1, 24, 0.04) 0px 3px 3px -1.5px, rgba(10, 1, 24, 0.04) 0px 6px 6px -3px, rgba(139, 92, 246, 0.04) 0px 12px 12px -6px, rgba(139, 92, 246, 0.04) 0px 24px 24px -12px",
        "resend-lg":
          "rgba(139, 92, 246, 0.06) 0px 0px 0px 1px, rgba(10, 1, 24, 0.06) 0px 2px 2px -1px, rgba(10, 1, 24, 0.06) 0px 6px 6px -3px, rgba(10, 1, 24, 0.06) 0px 12px 12px -6px, rgba(139, 92, 246, 0.06) 0px 24px 24px -12px, rgba(139, 92, 246, 0.06) 0px 48px 48px -24px",
        glow: "0 0 20px rgba(139, 92, 246, 0.3)",
        "glow-pink": "0 0 20px rgba(236, 72, 153, 0.3)",
      },
      animation: {
        "blur-in": "blur-in 0.7s ease-out forwards",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
      keyframes: {
        "blur-in": {
          "0%": { filter: "blur(12px)", opacity: "0", transform: "translateY(8px)" },
          "100%": { filter: "blur(0)", opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(139,92,246,0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(139,92,246,0.6)" },
        },
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
        "gradient-brand-subtle": "linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.2) 50%, rgba(236,72,153,0.2) 100%)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
}
