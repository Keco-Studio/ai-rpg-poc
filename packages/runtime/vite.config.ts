import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    open: false,
    fs: {
      // Allow serving files from the monorepo root (for shared package and examples)
      allow: [resolve(__dirname, '../..')],
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@ai-rpg-maker/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  // Serve the examples directory from the repo root
  plugins: [
    {
      name: 'serve-examples',
      configureServer(server) {
        const repoRoot = resolve(__dirname, '../..');
        server.middlewares.use('/examples', (req, res, next) => {
          const filePath = resolve(repoRoot, 'examples', req.url!.slice(1));
          // Use Vite's built-in static file serving via send
          import('fs').then((fs) => {
            if (fs.existsSync(filePath)) {
              const stream = fs.createReadStream(filePath);
              // Set content type based on extension
              const ext = filePath.split('.').pop();
              const mimeTypes: Record<string, string> = {
                json: 'application/json',
                png: 'image/png',
                jpg: 'image/jpeg',
                gif: 'image/gif',
              };
              res.setHeader(
                'Content-Type',
                mimeTypes[ext || ''] || 'application/octet-stream',
              );
              stream.pipe(res);
            } else {
              next();
            }
          });
        });
      },
    },
  ],
});
