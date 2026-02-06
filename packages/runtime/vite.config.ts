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
  // Serve the examples directory and project files from the repo root
  plugins: [
    {
      name: 'serve-static-dirs',
      configureServer(server) {
        const repoRoot = resolve(__dirname, '../..');
        const mimeTypes: Record<string, string> = {
          json: 'application/json',
          png: 'image/png',
          jpg: 'image/jpeg',
          gif: 'image/gif',
        };

        function serveDirectory(urlPrefix: string, fsBase: string) {
          server.middlewares.use(urlPrefix, (req, res, next) => {
            const filePath = resolve(fsBase, req.url!.slice(1));
            import('fs').then((fs) => {
              if (fs.existsSync(filePath)) {
                const stream = fs.createReadStream(filePath);
                const ext = filePath.split('.').pop();
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
        }

        serveDirectory('/examples', resolve(repoRoot, 'examples'));
        // Serve project JSON files from the repo root (e.g. /projects/project-123.json)
        serveDirectory('/projects', resolve(repoRoot, 'projects'));
      },
    },
  ],
});
