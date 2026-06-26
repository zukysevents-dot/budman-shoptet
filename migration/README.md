# Migrace WooCommerce → Shoptet

Skripty (Node.js, ESM, bez závislostí) pro převod produktů, kategorií a 301 přesměrování
z WooCommerce do importních souborů Shoptetu. **Idempotentní** — lze opakovaně spouštět.

## Pořadí spuštění

```bash
# 0) přístupy (jednorázově)
cp migration/config/.env.example migration/config/.env   # a vyplň WOO_* a SHOPTET_*

# 1) export z živého Woo přes REST API
npm run export            # → migration/data/raw/woo-products.json, woo-categories.json

# 2) transformace + čištění
npm run transform         # → migration/data/normalized/*.json (+ report.json)

# 3) build importních souborů
npm run build:all         # categories.csv, products.csv, products.xml, redirects.csv + validace
```

Vše najednou (export → build): `npm run migrate`.

### Test bez přístupů (dry-run na ukázkových datech)

```bash
npm run seed:fixture      # nakopíruje migration/fixtures/* do data/raw/
npm run build:all
```

## Výstupy (`migration/data/out/`)

| Soubor | K čemu | Kam v Shoptetu |
|---|---|---|
| `categories.csv` | strom kategorií (`title;url;parentUrl;description`) | Položky → Kategorie → Import |
| `products.csv` | **primární** import produktů (mapování sloupců v průvodci) | Položky → Produkty → Import |
| `products.xml` | sekundární feed s `<ORIG_URL>` (auto-301) | Export/Import → XML *(ověř ve validátoru)* |
| `redirects.csv` | 301 přesměrování (`fromUrl;toUrl;automatic`) | Marketing → Základní SEO → Přesměrování |

Pracovní data (`data/raw`, `data/normalized`, `data/out`) jsou v `.gitignore` — generují se skripty.

## Idempotence

- Re-export přepíše raw stav e-shopu.
- Shoptet páruje produkty podle `code` (popř. `ean`) → opakovaný import **aktualizuje**, nevytváří duplicity.
- Varianty se párují přes `pairCode` a **musí být v souvislém bloku** (skript to zajišťuje, validátor kontroluje).

## Validace

`npm run validate` (součást `build:all`) hlídá: unikátní `code`, souvislost variant, ceny > 0,
`includingVat` 0/1, max 3 parametry, existenci kategorií a syntax URL obrázků.
Dosažitelnost fotek (HTTP HEAD): `node migration/06-validate.mjs --check-images`.

> `products.xml` ještě ověř v oficiálním validátoru: <https://podpora.shoptet.cz/xml-validace/>.
> Názvy XML elementů je nutné sjednotit s aktuálním RELAX NG schématem (proto je primární cesta CSV).

## Konfigurace (`migration/config/`)

- `.env` — přístupy a volby (měna, DPH, `includingVat`, struktura URL kategorií).
- `mapping.mjs` — pravidla převodu: rozpoznání značky/EAN, které atributy jsou varianty, stavba starých/nových URL.

## Pozor (compliance)

CBD/headshop: v popiscích **neuvádět léčebné/zdravotní účinky**. Skripty nic nevymýšlí —
chybějící popisy jen hlásí do `report.json` k ručnímu doplnění a schválení.
