import type { PluginOption } from "vite-plus";
import type { BuiltinReporters } from "vite-plus/test/reporters";

import { lingui } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite-plus";

const isVitest = Boolean(process.env.VITEST);

const testReporters: BuiltinReporters[] = [];

if (process.env.GITHUB_ACTIONS) {
  testReporters.push("github-actions");
} else if (process.env.AGENT) {
  testReporters.push("agent");
} else {
  testReporters.push("dot");
}

const plugins: PluginOption[] = [tanstackStart({ router: { semicolons: true, quoteStyle: "double" } }), viteReact()];

if (!isVitest) {
  plugins.push(
    lingui(),
    tailwindcss(),
    nitro({
      plugins: ["plugins/1.migrate.ts"],
      rolldownConfig: {
        treeshake: {
          moduleSideEffects: (id) => {
            if (id.includes("unenv/polyfill/")) return true;
            if (id.includes("reflect-metadata/Reflect")) return true;
            if (id.includes("node-fetch-native/polyfill")) return true;
            return false;
          },
        },
      },
    }),
    babel({ plugins: ["@lingui/babel-plugin-lingui-macro"] }),
    VitePWA({
      outDir: "public",
      useCredentials: true,
      injectRegister: false,
      includeAssets: ["**/*"],
      registerType: "autoUpdate",
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ["**/*"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10mb
        navigateFallback: null, // Disable navigation fallback for SSR
      },
      manifest: {
        name: "Reactive Resume",
        short_name: "Reactive Resume",
        description: "A free and open-source resume builder.",
        id: "/?source=pwa",
        start_url: "/?source=pwa",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#09090B",
        background_color: "#09090B",
        icons: [
          {
            src: "favicon.ico",
            sizes: "128x128",
            type: "image/x-icon",
          },
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "screenshots/web/1-landing-page.webp",
            sizes: "1920x1080 any",
            type: "image/webp",
            form_factor: "wide",
            label: "Landing Page",
          },
          {
            src: "screenshots/web/2-resume-dashboard.webp",
            sizes: "1920x1080 any",
            type: "image/webp",
            form_factor: "wide",
            label: "Resume Dashboard",
          },
          {
            src: "screenshots/web/3-builder-screen.webp",
            sizes: "1920x1080 any",
            type: "image/webp",
            form_factor: "wide",
            label: "Builder Screen",
          },
          {
            src: "screenshots/web/4-template-gallery.webp",
            sizes: "1920x1080 any",
            type: "image/webp",
            form_factor: "wide",
            label: "Template Gallery",
          },
          {
            src: "screenshots/mobile/1-landing-page.webp",
            sizes: "1284x2778 any",
            type: "image/webp",
            form_factor: "narrow",
            label: "Landing Page",
          },
          {
            src: "screenshots/mobile/2-resume-dashboard.webp",
            sizes: "1284x2778 any",
            type: "image/webp",
            form_factor: "narrow",
            label: "Resume Dashboard",
          },
          {
            src: "screenshots/mobile/3-builder-screen.webp",
            sizes: "1284x2778 any",
            type: "image/webp",
            form_factor: "narrow",
            label: "Builder Screen",
          },
          {
            src: "screenshots/mobile/4-template-gallery.webp",
            sizes: "1284x2778 any",
            type: "image/webp",
            form_factor: "narrow",
            label: "Template Gallery",
          },
        ],
        categories: [
          "ai",
          "builder",
          "business",
          "career",
          "cv",
          "editor",
          "free",
          "generator",
          "job-search",
          "multilingual",
          "open-source",
          "privacy",
          "productivity",
          "resume",
          "self-hosted",
          "templates",
          "utilities",
          "writing",
        ],
      },
    }),
  );
}

const config = defineConfig({
  plugins,

  run: { cache: true },

  staged: {
    "*": "vp check --fix",
  },

  fmt: {
    printWidth: 120,
    ignorePatterns: ["webfontlist.json", "routeTree.gen.ts", "docs/changelog/index.mdx"],
    sortPackageJson: {
      sortScripts: true,
    },
    sortTailwindcss: {
      stylesheet: "./src/styles/globals.css",
      functions: ["clsx", "cva", "cn"],
    },
    sortImports: {
      groups: [
        "type-import",
        ["value-builtin", "value-external"],
        "type-internal",
        "value-internal",
        ["type-parent", "type-sibling", "type-index"],
        ["value-parent", "value-sibling", "value-index"],
        "unknown",
      ],
    },
  },

  lint: {
    env: { builtin: true },
    ignorePatterns: ["webfontlist.json", "routeTree.gen.ts"],
    options: { typeAware: true, typeCheck: true },
    settings: {
      react: {
        version: "19",
        linkComponents: ["Link"],
      },
    },
    plugins: [
      "eslint",
      "import",
      "jest",
      "jsdoc",
      "jsx-a11y",
      "node",
      "oxc",
      "promise",
      "react-perf",
      "react",
      "typescript",
      "unicorn",
      "vitest",
    ],
    rules: {
      "react/exhaustive-deps": "off",
      "jest/no-conditional-expect": "off",
      "jest/require-to-throw-message": "off",
      "typescript/consistent-type-imports": "error",
    },
  },

  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },

  resolve: {
    tsconfigPaths: true,
  },

  test: {
    environment: "happy-dom",
    reporters: testReporters,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: [
        "src/utils/**/*.{ts,tsx}",
        "src/hooks/**/*.{ts,tsx}",
        "src/integrations/**/*.{ts,tsx}",
        "src/components/**/*.{ts,tsx}",
        "src/schema/**/*.{ts,tsx}",
        "src/dialogs/**/*.{ts,tsx}",
      ],
      exclude: ["**/*.test.{ts,tsx}", "**/*.d.ts", "**/node_modules/**", "src/components/ui/**"],
      thresholds: {
        statements: 32,
        branches: 37,
        functions: 20,
        lines: 31,
      },
    },
  },

  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 10 * 1024, // 10mb
  },

  server: {
    host: true,
    port: 3000,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      host: "localhost",
      port: 3000,
    },
  },
});

export default config;
