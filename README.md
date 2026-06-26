# budman-shoptet

Migrace e-shopu **Budman** (headshop — dab/kuřácké potřeby + CBD, ČR, 18+) z **WordPress/WooCommerce
na Shoptet** a custom vzhled Shoptet šablony.

> Pivot: dřívější plán „zůstat na WordPressu" je nahrazen kompletním přechodem na Shoptet.
> Původní WP theme zůstává archivovaný jako reference (složka `Budman/` vedle tohoto repa).

## Stav

- ✅ **Fáze 1 — migrační pipeline** (export → transform → CSV/XML import + 301 redirecty), idempotentní, ověřená na fixture.
- ⏳ **Fáze 2 — vzhled** (custom CSS/JS na standardním tarifu) — čeká na schválení Fáze 1 + branding.

## Struktura

```
migration/        Node.js skripty (Woo REST → Shoptet import + redirecty) + fixtures
src/css, src/js   zdroje custom šablony (Fáze 2)
assets/           buildnuté budman.css / budman.js pro Shoptet FTP (Fáze 2)
templates/        snippety pro Návrhář / HTML editor (Fáze 2)
docs/             runbook, redirect mapa, obsahové stránky, design systém
```

## Rychlý start (migrace)

```bash
npm run seed:fixture && npm run build:all   # dry-run bez API (ukázková data)
# nebo s živým Woo:
cp migration/config/.env.example migration/config/.env   # vyplň přístupy
npm run migrate                                          # export + build vše
```

Detail: [migration/README.md](migration/README.md) · postup importu: [docs/migration-runbook.md](docs/migration-runbook.md).

## Klíčová fakta o Shoptetu (proč to děláme takhle)

- Import produktů: **CSV** (primárně, mapování sloupců v průvodci) / XML (`<ORIG_URL>` → auto-301) / XLSX.
- **DPH a měnu nastavit PŘED importem.** Ceny s DPH → `includingVat=1`.
- Idempotence: párování přes `code` (varianty přes `pairCode`, řádky vedle sebe).
- 301 redirecty povinné — slugy zachováme, mění se jen prefix (`/produkt/x/` → `/x/`).
- Vzhled na standardním tarifu: Návrhář šablon + HTML editor + custom CSS/JS přes **FTP**
  (`/user/documents/`); reference markupu: `github.com/shoptet/templates-assets`. Vanilla JS/CSS, ne React/Vue.
- Brána **18+**: doplněk z App Store (Ověř18.cz / Adulto) — Shoptet nemá nativní.

## Nasazení na Shoptet (Fáze 2, shrnutí)

1. `npm run build` → `assets/budman.css`, `assets/budman.js`.
2. Nahrát na Shoptet **FTP** do `/user/documents/`.
3. V *Návrhář šablon → HTML kódy* odkázat `<link>`/`<script src="…?v=N">` (cache-busting verzí).
4. Publikovat („Zveřejnit"). Rollback = vrátit předchozí verzi souboru / odebrat odkaz.

## Bezpečnost

- `migration/config/.env` (přístupy) je v `.gitignore` — **necommitovat**.
- Vše se připravuje a testuje na Shoptet **klonu**; ostrý web a DNS přepíná uživatel až na konci.
