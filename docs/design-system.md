# Design systém (Fáze 2)

> Placeholder — naplníme po schválení Fáze 1 a dodání brandingu (logo, barvy, fonty).
> Směr dle `Budman/docs/brand-catalog.md`: prémiový, moodier „gear shop", důraz na produktovou fotku.

## Tokeny (návrh, doladí se z loga)

| Token | Hodnota (placeholder) | Pozn. |
|---|---|---|
| `--color-bg` | `#0f0f0e` / `#ffffff` | tmavé téma zvážit pro „gear" feel |
| `--color-text` | `#1a1a17` | |
| `--color-muted` | `#6b6b66` | |
| `--color-accent` | `[z loga]` | CTA, badge akce |
| `--font-sans` | system-ui … (latin-ext) | brand font po dodání |
| `--container` | `1200px` | |
| `--radius` | `12px` | |
| `--space` | `clamp(1rem, 4vw, 2.5rem)` | |

Přenos z původního WP theme: `Budman/src/scss/base/_tokens.scss`.

## Komponenty (pokrytí)

Hlavička (sticky), patička, homepage (hero, nejprodávanější, kategorie, USP pruh), výpis kategorie,
detail produktu, košík (jen CSS — markup zamčený). Produktová karta, badge „skladem"/„akce".

## Animace

Scroll-reveal (IntersectionObserver — port `Budman/src/js/modules/reveal.js`, ale **bez GSAP** kvůli
výkonu/váze), hover karet, sticky header, plynulé přechody (CSS transforms/opacity).
Respektovat `prefers-reduced-motion`. Vanilla JS, žádný React/Vue.

## Přístupnost

Sémantika, kontrast (WCAG AA), klávesnicová navigace, focus stavy, alt texty, `prefers-reduced-motion`.

## Brána 18+

Doplněk z App Store (Ověř18.cz / Adulto). Nestylovat vlastní od nuly; jen sladit vizuál s brandem.
