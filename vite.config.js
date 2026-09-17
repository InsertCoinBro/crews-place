import { defineConfig } from "vite";

export default defineConfig({
  // Keep production assets relative so the same build works at a domain root
  // and under a project path such as /crews-place/ on GitHub Pages.
  base: "./",
});
