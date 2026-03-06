import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // e-BGX Brand Colors
        navy: {
          50:  "#F0F2F8",
          100: "#D8DCF0",
          200: "#B0BDE0",
          300: "#7C91CB",
          400: "#4D6AB8",
          500: "#2A4A9E",
          600: "#1E3A8A",
          700: "#1E2D52",
          800: "#0D1B3E",
          900: "#080F22",
          950: "#040811",
        },
        silver: {
          50:  "#F8F9FC",
          100: "#EEF0F7",
          200: "#D8E0EC",
          300: "#C0C8D8",
          400: "#A0ACBC",
          500: "#7A8CA0",
          600: "#5E7080",
          700: "#445460",
          800: "#2E3A44",
          900: "#1A2230",
        },
        // Status Colors
        status: {
          issued:   "#22C55E",
          pending:  "#F59E0B",
          rejected: "#EF4444",
          processing:"#3B82F6",
          accepted: "#14B8A6",
          expired:  "#9CA3AF",
          amended:  "#8B5CF6",
          draft:    "#6B7280",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "gradient-navy": "linear-gradient(135deg, #080F22 0%, #0D1B3E 50%, #1E2D52 100%)",
        "gradient-silver": "linear-gradient(135deg, #C0C8D8 0%, #E8EDF5 50%, #FFFFFF 100%)",
        "gradient-hero": "linear-gradient(180deg, #040811 0%, #0D1B3E 60%, #1E3A8A 100%)",
        "shimmer": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
      },
      boxShadow: {
        "navy": "0 4px 24px rgba(13, 27, 62, 0.4)",
        "card": "0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)",
        "card-dark": "0 1px 3px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2)",
        "glow": "0 0 24px rgba(30, 58, 138, 0.3)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "shimmer": "shimmer 2s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
