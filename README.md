# VOLTA — 3D scroll-driven product landing page

An ultra-premium, scroll-driven 3D product page built with **Vite + Three.js + GSAP ScrollTrigger + Lenis**.
Everything (copy, colors, 3D model, meta tags) is generated from **one config file**.

## Run it locally

```bash
npm install      # first time only — downloads the libraries
npm run dev      # starts the site at http://localhost:5173
```

Other commands:

```bash
npm run build    # creates the production version in /dist
npm run preview  # serves /dist at http://localhost:4173 to test it
```

## Change the product, brand or colors

Open **`src/config.js`** and edit the values at the top:

```js
export const PRODUCT = 'sneaker';            // 'sneaker' | 'headphones' | 'watch' | anything else
export const BRAND_NAME = 'VOLTA';
export const TAGLINE = 'Built for the bold.';
export const PRIMARY_COLOR = '#FFD600';      // main background
export const ACCENT_COLOR = '#FF3D00';       // second bold color
export const DARK_COLOR = '#0A0A0A';         // text color
export const COLOR_VARIANTS = ['#FFD600', '#FF3D00', '#00E5FF', '#B4FF00'];
```

Save — the page reloads with new copy, colors and a matching procedural 3D model.
`sneaker`, `headphones` and `watch` have hand-written copy and their own procedural models; any other
product word gets generic copy and a procedural bottle (drop in a real model, see below).

Want to tweak the wording? It lives in **`src/copy.js`** (one block per product).
After deploying, update `SITE_URL` in `src/config.js` to your live URL (used for social-share previews).

## Use a real 3D model (.glb)

1. Download a free model, for example:
   - **Sketchfab** — https://sketchfab.com/search?features=downloadable&licenses=7c23a1ba438d4306920229c12afcb5f9&type=models (filter: *Downloadable*, license *CC Attribution*)
   - **Poly Pizza** — https://poly.pizza (CC0 / CC-BY low-poly models)
   Choose the **glTF / .glb** format. Check the license and credit the author if it says *CC-BY*.
2. Rename it to **`product.glb`** and put it in **`public/models/`**.
3. Reload. The model is auto-centered and auto-scaled. Draco- and Meshopt-compressed files work.
4. Optional fine-tuning in `src/config.js` → `MODEL`:
   - `rotation: [x, y, z]` if it faces the wrong way (radians — `Math.PI / 2` = 90°)
   - `tintMaterials: ['MaterialName']` to choose which material changes color in the Colorways section
5. Tip — make big models small: `npx @gltf-transform/cli optimize product.glb product.glb --compress draco --texture-compress webp`

Delete `public/models/product.glb` to go back to the procedural model.

## Project structure

```
index.html              page shell (content is injected at build time)
vite.config.js          build config + content/inline-CSS plugins
src/config.js           ← EDIT THIS: product, brand, colors, model settings
src/copy.js             marketing copy per product
src/content.js          generates the page HTML + SEO meta tags from config/copy
src/main.js             boots everything in order
src/js/scene.js         renderer, camera, lighting, render loop, adaptive quality
src/js/shadow.js        soft contact shadow
src/js/model.js         loads product.glb or builds a procedural model
src/js/procedural/      sneaker / headphones / watch / bottle builders
src/js/scroll.js        the scroll choreography (poses per section) + text animations
src/js/lenis.js         smooth scrolling synced with GSAP
src/js/ui.js            cursor, magnetic buttons, nav, anchors, cart
src/js/preloader.js     loading counter + reveal wipe
src/styles/             fonts, base, sections, ui
public/                 fonts, images, favicon, robots.txt, models/
```

## Deploy / update

The site is hosted on Vercel and connected to GitHub. To publish changes:

```bash
git add -A
git commit -m "Describe your change"
git push
```

Vercel rebuilds and redeploys automatically within a minute.

## Credits

Fonts: Clash Display & Satoshi by Indian Type Foundry via [Fontshare](https://www.fontshare.com) (free for commercial use).
