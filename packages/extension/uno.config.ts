import { defineConfig, presetWind4 } from "unocss";

export default defineConfig({
  presets: [presetWind4()],
  theme: {
    colors: {
      bg: "var(--bg)",
      surface: "var(--surface)",
      "surface-strong": "var(--surface-strong)",
      border: "var(--border)",
      text: "var(--text)",
      muted: "var(--muted)",
      accent: "var(--accent)",
      "accent-soft": "var(--accent-soft)",
    },
  },
});
