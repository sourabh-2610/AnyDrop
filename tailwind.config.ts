import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "ad-bg":         "#F5F2EA",
        "ad-card":       "#F8F5EF",
        "ad-section":    "#EDE7D9",
        "ad-beige":      "#E3D8C8",
        "ad-sand":       "#D8CBB8",
        "ad-taupe":      "#B8AA98",
        "ad-sage":       "#C8D1C4",
        "ad-green":      "#91A392",
        "ad-green-soft": "#B1C0B1",
        "ad-border":     "#D8D0C3",
        "ad-text":       "#435247",
        "ad-text-sec":   "#756D62",
        "ad-accent":     "#C99F7A",
        "ad-brown":      "#4B4035",
        "ad-success":    "#7A9E7E",
        "ad-warning":    "#C4A35A",
        "ad-error":      "#C27B5A",
      },
      fontFamily: {
        sans: ["Inter", "Manrope", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card:  "24px",
        btn:   "16px",
        input: "14px",
        hero:  "32px",
      },
      animation: {
        float:       "float 6s ease-in-out infinite",
        pulseSoft:   "pulseSoft 3s ease-in-out infinite",
        fadeIn:      "fadeIn 0.5s ease-out",
        slideUp:     "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        scaleIn:     "scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%":     { transform: "translateY(-12px)" },
        },
        pulseSoft: {
          "0%,100%": { opacity: "1",   transform: "scale(1)" },
          "50%":     { opacity: "0.7", transform: "scale(0.97)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.9)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
      },
      boxShadow: {
        card:      "0 2px 20px rgba(67,82,71,0.06),0 1px 4px rgba(67,82,71,0.04)",
        "card-hover": "0 8px 32px rgba(67,82,71,0.10),0 2px 8px rgba(67,82,71,0.06)",
        btn:       "0 2px 8px rgba(145,163,146,0.30)",
        "btn-hover":"0 4px 16px rgba(145,163,146,0.40)",
        glow:      "0 0 40px rgba(145,163,146,0.20)",
      },
    },
  },
  plugins: [],
};

export default config;
