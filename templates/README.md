# templates — ⚠️ NEPOUŽÍVÁ SE (historická reference)

**Tyto snippety nejsou nikde napojené a nepopisují dnešní e-shop.** Vznikly před migrací,
kdy se počítalo s prodejem CBD — proto v `header.html` a `footer.html` najdeš odkazy na
`/extrakty-oleje-cbd/` a `/kvety/`. **Takové kategorie neexistují**, CBD se z migrace
záměrně vyřadilo (viz `EXCLUDED_CATEGORY_SLUGS` v `../migration/config/mapping.mjs`).

Nečti je jako popis sortimentu — svádí to k závěru, že se prodává CBD. Neprodává.

## Jak vzhled funguje doopravdy

Hlavičku, patičku i homepage bloky staví za běhu JavaScript nad nativním Shoptet markupem:

- `flattenMenu()`, `enhanceMenu()`, `buildCategoryDropdown()` — navigace
- `injectFooter()` — patička
- `injectHero()`, `injectPromo()`, `cleanDemo()` — homepage

Vše v [`../src/js/shoptet-enhance.js`](../src/js/shoptet-enhance.js), styly v `../src/css/`.
Nasazení viz README v kořeni repa.

Složka je ke smazání — držená jen jako historická reference.
