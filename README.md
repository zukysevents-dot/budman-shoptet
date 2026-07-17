# budman-shoptet

Migrace e-shopu **Budman** (headshop — dab gear a kuřácké potřeby, ČR, 18+) z **WordPress/WooCommerce
na Shoptet** a custom vzhled Shoptet šablony. Živý web: <https://www.budman-shop.cz/>.

> Pivot: dřívější plán „zůstat na WordPressu" je nahrazen kompletním přechodem na Shoptet.
> Původní WP theme zůstává archivovaný jako reference (složka `Budman/` vedle tohoto repa).

**Sortiment = jen hardware:** rigy, slurpery/bangery, Puffco doplňky, měření, balení, cleaning, merch.
**Žádné CBD, květy ani konzumovatelné zboží** — vyřazeno při migraci (volba klienta, viz
`EXCLUDED_CATEGORY_SLUGS` v [mapping.mjs](migration/config/mapping.mjs)). Staré CBD URL vedou 301 na homepage.

## Stav

- ✅ **Fáze 1 — migrační pipeline** (export → transform → CSV/XML import + 301 redirecty), idempotentní, ověřená na fixture.
- ✅ **Fáze 2 — vzhled** — hotová a **nasazená na živém webu** (custom CSS/JS servírované z jsDelivru, viz Nasazení níže).

## Struktura

```
migration/        Node.js skripty (Woo REST → Shoptet import + redirecty) + fixtures
src/css, src/js   zdroje custom šablony — JEDINÝ zdroj pravdy pro vzhled
assets/           buildnuté budman.css / budman.js (commitují se, servíruje je jsDelivr)
preview/          lokální mockupy Shoptet markupu pro vývoj (`node preview/server.mjs`)
docs/             runbook, redirect mapa, obsahové stránky, design systém
```

> Hlavičku, patičku i homepage bloky staví za běhu JS nad nativním Shoptet markupem
> (`flattenMenu()`, `injectFooter()`, `injectHero()` v [shoptet-enhance.js](src/js/shoptet-enhance.js)) —
> žádné HTML snippety se do Návrháře nevkládají. Dřívější složka `templates/` s předmigračními
> mockupy byla smazána (popisovala sortiment s CBD, který se neprodává); je v git historii.

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
- Vzhled na standardním tarifu: Návrhář šablon + HTML editor + custom CSS/JS.
  Reference markupu: `github.com/shoptet/templates-assets`. Vanilla JS/CSS, ne React/Vue.
- Brána **18+**: doplněk z App Store (Ověř18.cz / Adulto) — Shoptet nemá nativní.

## Platby (proč nejsou karty)

Karetní bránu e-shop **nemá a mít nebude** — ShoptetPay žádost zamítl, protože „kuřácké potřeby"
jsou položkou na jejich seznamu zakázaného zboží (stejné pravidlo má Stripe pod „drug paraphernalia").
Není to volba brány, ale kategorie obchodu: Apple Pay i karty jedou po Visa/Mastercard kolejích,
takže jiná brána narazí na totéž. V provozu jsou proto:

- **Převodem** (výchozí, zdarma) — Shoptet k němu posílá QR kód; vyžaduje vyplněný účet
  a zapnuté zobrazení QR v *Nastavení → Platby → Převodem*.
- **Hotově** — povolené **jen** u dopravy Osobní odběr (Praha 3, Žižkov).

Sidebar box „Přijímáme online platby" s logy VISA/Mastercard je nativní Shoptet prvek, který
tvrdil nepravdu → `paymentBox()` v [shoptet-enhance.js](src/js/shoptet-enhance.js) ho přeobsazuje
reálnými metodami. `checkoutPayHints()` k platbám v pokladně dopisuje vysvětlivky.

## Nasazení na Shoptet (Fáze 2)

Assety se **neposílají přes FTP** — servíruje je jsDelivr přímo z tohoto GitHub repa,
připnutý na konkrétní commit (jsDelivr na `@main` cachuje stale, proto pin).

1. `npm run build` → `assets/budman.css`, `assets/budman.js`.
2. Commitnout **včetně `assets/`** a pushnout na `main`.
3. V *Návrhář šablon → HTML kódy (záhlaví)* přepsat hash commitu v obou URL:
   ```html
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/zukysevents-dot/budman-shoptet@<commit>/assets/budman.css">
   <script src="https://cdn.jsdelivr.net/gh/zukysevents-dot/budman-shoptet@<commit>/assets/budman.js" defer></script>
   ```
4. Publikovat („Zveřejnit"). **Rollback = vrátit hash na předchozí commit.**

> Bez kroku 3 se změna neprojeví — starý commit se servíruje dál. Měnitelné assety
> (obrázky v `assets/hero`, `assets/brand`) jsou v JS pinnuté zvlášť, viz konstanty
> `RIG_URL`, `B_URL`, `CDN_PIN_LOGO`.

## Bezpečnost

- `migration/config/.env` (přístupy) je v `.gitignore` — **necommitovat**.
- Vše se připravuje a testuje na Shoptet **klonu**; ostrý web a DNS přepíná uživatel až na konci.
