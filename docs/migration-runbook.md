# Migrační runbook — import na Shoptet klonu

Krok za krokem. **Vše na klonovém/zkušebním e-shopu**, ostrý web se nesahá až do cutoveru.
Legenda: 🧑‍💻 = naklikáš ty v Shoptet adminu · 🤖 = připravím já (kód/data).

---

> **Vyřazené CBD:** kategorie „Extrakty a oleje CBD", „Květy", „CBD" a jejich produkty
> (Night Dab, Day Dab) se NEimportují (volba klienta). Jejich staré URL jsou v `redirects.csv`
> přesměrované na homepage (`/`). Seznam vyřazeného: `migration/data/normalized/removed.json`.
> Nastavení vyřazení: `EXCLUDED_CATEGORY_SLUGS` v `migration/config/mapping.mjs`.

## 0. Příprava

- 🤖 Vyplněné `migration/config/.env` (Woo přístupy + URL klonu).
- 🤖 `npm run migrate` → vygenerované soubory v `migration/data/out/`.
- 🧑‍💻 Přístup do administrace klonu + FTP (pro pozdější nasazení šablony).
- 🧑‍💻 WooCommerce a fotky musí **zůstat online**, dokud import nedoběhne (Shoptet si fotky stahuje z URL).

## 1. ⚠️ DPH a měna — NEJDŘÍV (před jakýmkoli importem)

- 🧑‍💻 *Nastavení → Základní nastavení → Daně* — sazby DPH (ČR 21 / 12 / 0) a volba, zda jsou ceny **s DPH** (pro B2C ano → odpovídá `includingVat=1`).
- 🧑‍💻 *Nastavení → Měny* — ověř `CZK`.

> Když se DPH/měna nastaví až po importu, musí se ručně přepočítat každá cena.

## 2. Import kategorií

- 🧑‍💻 *Položky → Kategorie → Import* → nahraj `categories.csv` (oddělovač `;`, UTF-8).
- 🧑‍💻 Namapuj sloupce: `title` → Název, `url` → URL, `parentUrl` → Nadřazená,
  `description` → Popis, `seoTitle` → SEO titulek, `metaDescription` → Meta description,
  `imageUrl` → Obrázek (URL). Pokud průvodce SEO/obrázek nenabízí, doplň je ručně (jen 9 kategorií).
- 🧑‍💻 Re-import **aktualizuje** existující kategorie (páruje podle `url`) — popisy/SEO/obrázky se doplní.
- 🧑‍💻 Zkontroluj strom (rodiče/děti). Soubor má rodiče v pořadí první.

## 3. Import produktů (primárně CSV)

- 🧑‍💻 *Položky → Produkty → Import* → nahraj `products.csv`.
- 🧑‍💻 **Nastavení importu:** pro **první import** nech „Neměnit produkty a varianty…" (bezpečné),
  ponech zaškrtnuté „Aktivovat přesměrování u změněných URL", a **NEZAŠKRTÁVEJ**
  „Změňte adresu URL produktu podle názvu" — URL řídíme sloupcem `url` (kvůli přesnosti redirectů).
- 🧑‍💻 V **průvodci namapuj sloupce** na pole Shoptetu:

| Sloupec v CSV | Pole Shoptetu |
|---|---|
| `code` | Kód produktu (párovací) |
| `pairCode` | Párovací kód variant |
| `name` | Název |
| `url` | URL adresa produktu (slug) |
| `manufacturer` | Výrobce |
| `ean` | EAN |
| `defaultCategory` | Výchozí kategorie |
| `price` | Cena |
| `vatRate` | Sazba DPH |
| `includingVat` | Cena vč. DPH (ano/ne) |
| `actionPrice` / `actionFrom` / `actionUntil` | Akční cena a platnost |
| `weight` | Hmotnost |
| `availability` / `stock` | Dostupnost / sklad |
| `shortDescription` / `description` | Krátký / dlouhý popis |
| `seoTitle` | SEO titulek produktu |
| `metaDescription` | Meta description (SEO) |
| `variant:Barva` (apod.) | Parametr varianty |
| `image`, `image2`, … | Obrázky (URL) |

- 🧑‍💻 Nech doběhnout stažení fotek (Shoptet je převede na WebP).
- 🧑‍💻 **Kontrola vzorku:** otevři 3–5 produktů (vč. variant „Glass Tips" a akčního „Night Dab") — cena, akční cena, varianty, fotky, dostupnost.

> Alternativa: `products.xml` (nese `<ORIG_URL>` → 301 se vytvoří samo). Před importem ho ověř ve validátoru
> <https://podpora.shoptet.cz/xml-validace/> a sjednoť názvy elementů se schématem. Pro jistotu jedeme CSV.

## 4. Přesměrování (301)

- 🧑‍💻 *Marketing → Základní SEO → Přesměrování* → import `redirects.csv` (`fromUrl;toUrl;automatic`).
- 🧑‍💻 Doplň přesměrování **obsahových stránek** dle `docs/redirect-map.md` (jejich Shoptet URL znáš až po vytvoření stránek).

## 5. Obsahové stránky a brána 18+

- 🧑‍💻 *Obsah webu → Stránky* — vytvoř/­vlož: O nás, Kontakt, Doprava a platba, Obchodní podmínky, Ochrana osobních údajů, Reklamace (návrhy v `docs/content/`).
- 🧑‍💻 *Doplňky (App Store)* — nainstaluj a zapni **ověření věku 18+** (Ověř18.cz / Adulto).

## 6. Re-import / idempotence (ověření)

- 🧑‍💻 Naimportuj `products.csv` znovu → nesmí vzniknout duplicity (párování přes `code`).
- 🤖 Při změně dat: `npm run migrate` a opakuj import.

## 7. Akceptační kontrola na klonu (před cutoverem)

- [ ] Ceny vč. DPH sedí (vzorek napříč cenovým rozpětím 40–7 349 Kč)
- [ ] Varianty správně spárované, akční ceny platné
- [ ] Fotky staženy, hlavní + galerie
- [ ] Strom kategorií odpovídá
- [ ] Vybraná stará URL → 301 → nová stránka (200)
- [ ] Brána 18+ funguje, neblokuje indexaci
- [ ] Obsahové + právní stránky vloženy

---

## Cutover (až je vše OK)

1. 🤖/🧑‍💻 Finální `npm run migrate` + re-import (čerstvá data).
2. 🧑‍💻 **Přepnutí domény (DNS)** na Shoptet — dělá uživatel.
3. 🧑‍💻 Po přepnutí: ověřit redirecty, nahrát sitemapu do Google + Seznam Search Console.
4. 🧑‍💻 Kontrola: fotky, ceny, dostupnost na ostrém webu.

## Rollback

DNS stále směřuje na původní WordPress, dokud ho nepřepneš → rollback = nepřepínat / vrátit DNS zpět.
WordPress a fotky drž online až do potvrzení, že je Shoptet v pořádku.
