import { defineConfig } from 'vite';
import { renderHead, renderBody } from './src/content.js';

/**
 * Injects the page markup (generated from src/config.js + src/copy.js) into index.html.
 * Vite restarts automatically whenever config/copy/content change, so edits show up instantly.
 */
const contentPlugin = () => ({
  name: 'volta-content',
  transformIndexHtml: (html) => html.replace('<!--app-head-->', renderHead()).replace('<!--app-body-->', renderBody()),
});

/**
 * Build only: inline the (small, ~5 kB gzipped) CSS into index.html.
 * Saves a render-blocking round trip → faster first paint on mobile.
 */
const inlineCssPlugin = () => ({
  name: 'volta-inline-css',
  apply: 'build',
  enforce: 'post',
  generateBundle(_, bundle) {
    const html = bundle['index.html'];
    if (!html) return;
    for (const [name, file] of Object.entries(bundle)) {
      if (!name.endsWith('.css')) continue;
      const tag = new RegExp(`<link rel="stylesheet"[^>]*href="/${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`);
      if (!tag.test(html.source)) continue;
      html.source = html.source.replace(tag, () => `<style>${file.source}</style>`);
      delete bundle[name];
    }
  },
});

export default defineConfig({
  plugins: [contentPlugin(), inlineCssPlugin()],
  build: {
    target: 'es2020',
    // three.js core is ~700 kB minified (~180 kB gzipped) and is lazy-loaded after first paint
    chunkSizeWarningLimit: 800,
  },
});
