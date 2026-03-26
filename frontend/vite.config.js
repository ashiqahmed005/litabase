import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Tiny plugin that resolves <%- include('partials/_foo.html') %> at build/dev time.
// Replaces vite-plugin-html with zero extra dependencies.
function htmlPartials() {
  return {
    name: 'html-partials',
    // order:'pre' runs this hook before Vite's parse5 HTML parser sees the file,
    // so <%- include() %> tags are replaced with real HTML before any parsing occurs.
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(/<%- include\('(.+?)'\) %>/g, (_, file) => {
          const abs = path.join(__dirname, file);
          return readFileSync(abs, 'utf-8');
        });
      },
    },
  };
}

export default defineConfig({
  plugins: [htmlPartials()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
