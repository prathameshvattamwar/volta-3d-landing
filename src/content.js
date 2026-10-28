/**
 * Renders the page markup from config + copy.
 * Runs at BUILD time (via the Vite plugin in vite.config.js), so the final HTML
 * is static, SEO-friendly and paints instantly — no JS needed to see the text.
 */
import { PRIMARY_COLOR, ACCENT_COLOR, DARK_COLOR, SITE_URL } from './config.js';
import { COPY } from './copy.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const pad = (n) => String(n).padStart(2, '0');

/** Wrap each letter in a mask + span so it can be animated (split-letter stagger). */
const splitChars = (text) =>
  [...text]
    .map((ch) => (ch === ' ' ? '<span class="char-space"> </span>' : `<span class="char-mask"><span class="char">${esc(ch)}</span></span>`))
    .join('');

/** Wrap each word for word-by-word reveals. */
const splitWords = (text) =>
  text
    .split(' ')
    .map((w) => `<span class="word-mask"><span class="word">${esc(w)}</span></span>`)
    .join(' ');

const arrow = `<svg class="icon-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>`;

export function renderHead() {
  const title = `${COPY.fullName} — ${COPY.tagline}`;
  const d = esc(COPY.meta.description);
  return `
    <title>${esc(title)}</title>
    <meta name="description" content="${d}" />
    <meta name="theme-color" content="${PRIMARY_COLOR}" />
    <link rel="canonical" href="${SITE_URL}/" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${esc(COPY.brand)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:url" content="${SITE_URL}/" />
    <meta property="og:image" content="${SITE_URL}/images/og.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(COPY.fullName)} ${esc(COPY.product)} on a bold ${esc(COPY.colorways[0]?.name || '')} background" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${d}" />
    <meta name="twitter:image" content="${SITE_URL}/images/og.jpg" />
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: COPY.fullName,
      brand: { '@type': 'Brand', name: COPY.brandTitle },
      description: COPY.meta.description,
      image: `${SITE_URL}/images/og.jpg`,
      offers: { '@type': 'Offer', price: COPY.price, priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    })}</script>
    <style>:root{--primary:${PRIMARY_COLOR};--accent:${ACCENT_COLOR};--dark:${DARK_COLOR};--bg:${PRIMARY_COLOR};--fg:${DARK_COLOR}}</style>
    <script>document.documentElement.classList.add('js')</script>`;
}

export function renderBody() {
  const c = COPY;
  const total = pad(c.colorways.length);

  return `
  <a class="skip-link" href="#main">Skip to content</a>

  <!-- Preloader: percentage tied to real asset loading -->
  <div class="preloader" role="status" aria-live="polite" aria-label="Loading">
    <div class="preloader__panel preloader__panel--accent"></div>
    <div class="preloader__panel preloader__panel--main">
      <span class="preloader__brand">${esc(c.brand)}</span>
      <span class="preloader__label">${esc(c.fullName)}</span>
      <span class="preloader__count"><span data-preloader-count>0</span>%</span>
      <span class="preloader__bar"><span data-preloader-bar></span></span>
    </div>
  </div>

  <!-- Backdrop layer: sits BEHIND the 3D canvas (for depth) -->
  <div class="backdrop" aria-hidden="true">
    <div class="backdrop__hero" style="--chars:${[...c.brand].length}">
      <div class="hero-word">${splitChars(c.brand)}</div>
    </div>
    <div class="backdrop__marquee">
      <div class="marquee-row" data-marquee="1"><span>${esc(c.layers.marquee)} — ${esc(c.layers.marquee)} — ${esc(c.layers.marquee)} — </span></div>
      <div class="marquee-row marquee-row--fill" data-marquee="-1"><span>${esc(c.brand)} ${esc(c.modelName.toUpperCase())} — ${esc(c.brand)} ${esc(c.modelName.toUpperCase())} — ${esc(c.brand)} ${esc(c.modelName.toUpperCase())} — </span></div>
    </div>
    <div class="backdrop__cta"><span>${esc(c.brand)}</span></div>
  </div>

  <!-- 3D stage (canvas is injected here) + static fallback when WebGL is unavailable -->
  <div class="stage" data-stage>
    <img class="stage__fallback" src="/images/fallback.webp" alt="${esc(c.fullName)} ${esc(c.product)}" width="1200" height="900" loading="lazy" decoding="async" hidden />
  </div>

  <header class="nav" data-nav>
    <a class="nav__logo" href="#top" aria-label="${esc(c.brand)} — back to top">${esc(c.brand)}<span class="nav__dot" aria-hidden="true"></span></a>
    <nav class="nav__links" aria-label="Primary">
      <a href="#design">Design</a>
      <a href="#features">Features</a>
      <a href="#colors">Colors</a>
      <a href="#specs">Specs</a>
    </nav>
    <div class="nav__actions">
      <a class="nav__shop" href="#shop">Shop</a>
      <button class="nav__cart" type="button" aria-label="Cart, 0 items" data-cart>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 8h14l-1.2 12H6.2L5 8Z M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
        <span class="nav__cart-count" data-cart-count>0</span>
      </button>
    </div>
  </header>

  <main id="main">
    <!-- 1. HERO -->
    <section class="section hero" id="top" aria-labelledby="hero-title" data-section="hero">
      <h1 id="hero-title" class="visually-hidden">${esc(c.fullName)} — ${esc(c.tagline)}</h1>
      <div class="hero__top">
        <p class="eyebrow" data-hero-fade><span class="eyebrow__dot" aria-hidden="true"></span>${esc(c.heroEyebrow)}</p>
      </div>
      <div class="hero__bottom">
        <p class="hero__tagline" aria-hidden="true">${splitWords(c.tagline)}</p>
        <div class="hero__meta" data-hero-fade>
          <p class="hero__note">${esc(c.heroNote)}</p>
          <a class="btn btn--dark" href="#shop" data-magnetic><span class="btn__label">Shop ${esc(c.modelName)} — $${c.price}</span>${arrow}</a>
        </div>
      </div>
      <div class="scroll-indicator" data-hero-fade aria-hidden="true">
        <span>Scroll</span><span class="scroll-indicator__line"></span>
      </div>
    </section>

    <!-- 2. SPIN REVEAL -->
    <section class="section intro" id="design" aria-labelledby="intro-title" data-section="intro">
      <div class="sticky">
        <div class="intro__content" data-intro>
          <p class="eyebrow">${esc(c.intro.eyebrow)}</p>
          <h2 id="intro-title" class="h2">${esc(c.intro.title)}</h2>
          <p class="body-l">${esc(c.intro.body)}</p>
          <dl class="intro__stats">
            ${c.intro.stats.map(([v, l]) => `<div><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join('')}
          </dl>
        </div>
      </div>
    </section>

    <!-- 3. FEATURE CALLOUTS -->
    <section class="section callouts" id="features" aria-labelledby="callouts-title" data-section="callouts">
      <div class="sticky">
        <h2 id="callouts-title" class="callouts__title eyebrow">02 — In focus</h2>
        <svg class="callouts__lines" aria-hidden="true">
          ${c.callouts.map(() => '<g class="callout-line"><line /><circle class="callout-line__dot" r="5" /><circle class="callout-line__pulse" r="5" /></g>').join('')}
        </svg>
        ${c.callouts
          .map(
            (f, i) => `
        <article class="callout callout--${f.side}" data-callout="${i}">
          <span class="callout__index">${pad(i + 1)}</span>
          <h3 class="callout__title">${esc(f.title)}</h3>
          <p class="callout__body">${esc(f.body)}</p>
        </article>`
          )
          .join('')}
      </div>
    </section>

    <!-- 4. COLORWAY SWITCH -->
    <section class="section colorway" id="colors" aria-labelledby="colorway-title" data-section="colorway">
      <div class="sticky">
        <div class="colorway__head">
          <p class="eyebrow">03 — Colorways</p>
          <h2 id="colorway-title" class="h2">Pick your power.</h2>
        </div>
        <div class="colorway__counter" aria-hidden="true">
          <span class="colorway__num"><span class="colorway__num-track" data-colorway-track>${c.colorways.map((_, i) => `<span>${pad(i + 1)}</span>`).join('')}</span></span>
          <span class="colorway__total">/ ${total}</span>
        </div>
        <div class="colorway__info">
          <p class="colorway__name-wrap"><span class="colorway__name" data-colorway-name aria-live="polite">${esc(c.colorways[0]?.name || '')}</span></p>
          <ul class="colorway__swatches" aria-label="Available colorways">
            ${c.colorways
              .map(
                (cw, i) =>
                  `<li><button type="button" class="swatch${i === 0 ? ' is-active' : ''}" style="--swatch:${cw.hex}" data-swatch="${i}" aria-label="Show ${esc(cw.name)} colorway"></button></li>`
              )
              .join('')}
          </ul>
        </div>
      </div>
    </section>

    <!-- 5. EXPLODED / DETAIL VIEW -->
    <section class="section layers" id="anatomy" aria-labelledby="layers-title" data-section="layers">
      <div class="sticky">
        <div class="layers__head">
          <p class="eyebrow">${esc(c.layers.eyebrow)}</p>
          <h2 id="layers-title" class="h2">${esc(c.layers.title)}</h2>
        </div>
        <ol class="layers__list">
          ${c.layers.items.map((it, i) => `<li><span>${pad(i + 1)}</span>${esc(it)}</li>`).join('')}
        </ol>
      </div>
    </section>

    <!-- 6. SPECS -->
    <section class="section specs" id="specs" aria-labelledby="specs-title" data-section="specs">
      <div class="specs__inner">
        <p class="eyebrow">${esc(c.specs.eyebrow)}</p>
        <h2 id="specs-title" class="h2">${esc(c.specs.title)}</h2>
        <dl class="specs__grid">
          ${c.specs.items
            .map(
              (s) => `
          <div class="spec">
            <dt class="spec__label">${esc(s.label)}</dt>
            <dd class="spec__value"><span data-count="${s.value}">${s.value}</span><span class="spec__suffix">${esc(s.suffix)}</span></dd>
          </div>`
            )
            .join('')}
        </dl>
      </div>
    </section>

    <!-- 7. FINAL CTA -->
    <section class="section cta" id="shop" aria-labelledby="cta-title" data-section="cta">
      <div class="cta__top">
        <p class="eyebrow">${esc(c.fullName)} · ${esc(c.category)}</p>
        <h2 id="cta-title" class="cta__title">${splitWords(c.cta.title)}</h2>
      </div>
      <div class="cta__bottom">
        <p class="cta__body">${esc(c.cta.body)}</p>
        <a class="btn btn--xl" href="#shop" data-magnetic data-add-to-cart>
          <span class="btn__label">${esc(c.cta.button)} — $${c.price}</span>${arrow}
        </a>
        <p class="cta__note">${esc(c.cta.note)}</p>
      </div>
    </section>
  </main>

  <footer class="footer" aria-label="Footer">
    <div class="footer__grid">
      <div class="footer__brand">
        <p class="footer__word">${esc(c.brand)}</p>
        <p class="footer__tag">${esc(c.tagline)}</p>
      </div>
      <nav class="footer__col" aria-label="Shop">
        <p class="footer__head">Shop</p>
        <a href="#shop">${esc(c.modelName)}</a><a href="#colors">Colorways</a><a href="#specs">Specs</a>
      </nav>
      <nav class="footer__col" aria-label="Support">
        <p class="footer__head">Support</p>
        <a href="#shop">Shipping</a><a href="#shop">Returns</a><a href="#shop">Size guide</a>
      </nav>
      <nav class="footer__col" aria-label="Social">
        <p class="footer__head">Follow</p>
        <a href="https://instagram.com" rel="noopener" target="_blank">Instagram</a><a href="https://tiktok.com" rel="noopener" target="_blank">TikTok</a><a href="https://youtube.com" rel="noopener" target="_blank">YouTube</a>
      </nav>
    </div>
    <div class="footer__legal">
      <span>© ${new Date().getFullYear()} ${esc(c.brandTitle)}. All rights reserved.</span>
      <a href="#top">Back to top ↑</a>
    </div>
  </footer>

  <div class="cursor" aria-hidden="true"><span class="cursor__ring"></span><span class="cursor__dot"></span></div>
  <div class="grain" aria-hidden="true"></div>
  <noscript><style>.preloader{display:none}.char,.word{transform:none!important}</style></noscript>`;
}
