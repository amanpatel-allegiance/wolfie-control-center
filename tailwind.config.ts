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
          bg:      "#F7F8FA",
          panel:   "#FFFFFF",
          border:  "#E3E7ED",
          ink:     "#182230",
          muted:   "#667085",
          soft:    "#F2F4F7",
          accent:  "#4F46E5",
          navy:    "#101828",
          lavender:"#EEF2FF",
        },
        state: {
          healthy:  "#12A878",
          warning:  "#EAAA08",
          failed:   "#E5484D",
          stale:    "#F97316",
          running:  "#3B82F6",
          stuck:    "#8B5CF6",
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
        card: "0 1px 2px rgba(16,24,40,.04), 0 4px 12px rgba(16,24,40,.025)",
        lift: "0 16px 40px rgba(16,24,40,.12)",
      },
    },
  },
  plugins: [],
};

export default config;
