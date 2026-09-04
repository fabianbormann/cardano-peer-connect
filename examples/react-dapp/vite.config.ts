import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';

// Deployed under the project Pages path https://<user>.github.io/cardano-peer-connect/
// In dev, base is '/'.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/cardano-peer-connect/' : '/',
  // vite-plugin-wasm emits top-level await; targeting esnext lets Vite/Rollup
  // emit it natively (modern browsers only — fine for a demo on GitHub Pages)
  // instead of relying on vite-plugin-top-level-await (swc-version fragile).
  plugins: [react(), wasm()],
  resolve: {
    alias: {
      // The published dist is a webpack UMD bundle, so Rollup can't tree the
      // named exports. In-repo we compile the library's TS source directly
      // (always matches the repo, ESM-friendly). Its runtime deps (peerjs, etc.)
      // resolve from node_modules via the file:../.. dependency.
      '@fabianbormann/cardano-peer-connect': fileURLToPath(
        new URL('../../index.ts', import.meta.url),
      ),
    },
  },
  // Lucid Evolution ships WASM (CML) and uses BigInt/top-level await.
  build: { target: 'esnext' },
  optimizeDeps: { esbuildOptions: { target: 'esnext' } },
  worker: { format: 'es' },
}));
