import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wolfie: {
          bg:      "#F6F7F9",
          panel:   "#FFFFFF",
          border:  "#E3E7EC",
          ink:     "#101828",
          muted:   "#667085",
          subtle:  "#98A2B3",
          soft:    "#F9FAFB",
          accent:  "#0F9F6E",
          navy:    "#081321",
          nav:     "#102033",
          lavender:"#E9F8F1",
        },
        state: {
          healthy:  "#0F9F6E",
          warning:  "#E88908",
          failed:   "#E43D3D",
          stale:    "#E88908",
          running:  "#2563EB",
          stuck:    "#E43D3D",
          disabled: "#98A2B3",
          unknown:  "#667085",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.04), 0 4px 12px rgba(16,24,40,.04)",
        lift: "0 16px 40px rgba(16,24,40,.12)",
      },
    },
  },
  plugins: [],
};

export default config;
