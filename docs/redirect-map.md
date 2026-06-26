# Mapa 301 přesměrování

Cíl: žádná stará URL nesmí po migraci vracet 404. Slugy **zachováváme** → mění se jen prefix,
takže produktová a kategorijní přesměrování jsou deterministická a generuje je skript.

## Princip

| Typ | Stará Woo URL | Nová Shoptet URL |
|---|---|---|
| Produkt | `/produkt/<slug>/` | `/<slug>/` |
| Kategorie | `/kategorie-produktu/<slug>/` | `/<slug>/` (nebo `/kategorie/<slug>/`) |

- Prefixy Woo a režim kategorií se řídí v `migration/config/.env`
  (`WOO_PRODUCT_PREFIX`, `WOO_CATEGORY_PREFIX`, `SHOPTET_CATEGORY_URL_MODE`).
- Automaticky generováno do `migration/data/out/redirects.csv` (krok `05`).
- Varianty sdílí jednu produktovou URL → v mapě jsou jednou (deduplikace).

## Obsahové stránky (doplnit ručně)

Shoptet URL těchto stránek znáš až po jejich vytvoření — doplň do přesměrování ručně:

| Stará Woo URL | Nová Shoptet URL (doplň) |
|---|---|
| `/obchodni-podminky/` | … |
| `/ochrana-osobnich-udaju/` | … |
| `/doprava-a-platba/` | … |
| `/reklamace/` | … |
| `/o-nas/` | … |
| `/kontakt/` | … |
| `/muj-ucet/` | (Shoptet má vlastní účet — přesměruj na odpovídající stránku) |

## Kontrola po cutoveru

1. Vezmi vzorek řádků z `redirects.csv` + výše uvedené stránky.
2. Ověř, že stará URL vrací **301** a cílová **200** (např. `curl -I`).
3. V Google Search Console sleduj report 404 / Pokrytí v prvních dnech.
