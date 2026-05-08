import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
const host = process.env.TAURI_DEV_HOST;
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
        },
    },
    clearScreen: false,
    server: {
        port: 5173,
        host: host || false,
        hmr: host ? { protocol: "ws", host, port: 5174 } : undefined,
        watch: { ignored: ["**/src-tauri/**"] },
    },
    envPrefix: ["VITE_", "TAURI_"],
    build: {
        target: "esnext",
        minify: !process.env.TAURI_DEBUG ? "oxc" : false,
        sourcemap: !!process.env.TAURI_DEBUG,
    },
    test: {
        globals: true,
        environment: "jsdom",
        include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    },
});
