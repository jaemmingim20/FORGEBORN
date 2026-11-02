import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'standalone' ? [viteSingleFile({ useRecommendedBuildConfig: false })] : [],
  build: {
    outDir: mode === 'standalone' ? 'standalone' : 'dist',
    copyPublicDir: mode !== 'standalone',
    assetsInlineLimit: mode === 'standalone' ? Infinity : 4096,
    cssCodeSplit: mode !== 'standalone',
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        codeSplitting:
          mode === 'standalone'
            ? false
            : {
                groups: [
                  { name: 'physics', test: /@dimforge/ },
                  { name: 'three', test: /node_modules\/three/ },
                ],
              },
      },
    },
  },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 15000 },
}));
