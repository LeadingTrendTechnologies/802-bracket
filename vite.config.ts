import { defineConfig } from "vite";
import { nitroV2Plugin as nitro } from "@solidjs/vite-plugin-nitro-2";
import { solidStart } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

// Use the Vercel preset when building on Vercel (or when NITRO_PRESET is set),
// so Nitro emits `.vercel/output` (Build Output API) instead of a static-only
// `.output/public`. Local dev/build keep the default node-server preset.
const preset =
  process.env.NITRO_PRESET ?? (process.env.VERCEL ? "vercel" : undefined);

export default defineConfig({
  plugins: [
    solidStart(),
    tailwindcss(),
    nitro(preset ? { preset } : {}),
  ],
});
