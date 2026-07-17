# Doprava a platba

> Odpovídá metodám reálně nastaveným v Shoptetu (ověřeno průchodem pokladny).
> Když v adminu něco přidáš nebo změníš, uprav i tenhle text.

## Doprava

| Způsob | Cena | Dodání |
|---|---|---|
| Zásilkovna — výdejní místa a boxy | [DOPLŇ] Kč (zdarma od 1 500 Kč) | 1–2 prac. dny |
| Osobní odběr — Praha 3, Žižkov | zdarma | dle domluvy |

- **Doprava zdarma** při objednávce nad 1 500 Kč.
- Zboží skladem expedujeme do 24 hodin.

## Platba

| Způsob | Poznámka |
|---|---|
| Převodem | Zdarma. Po objednávce dostaneš QR kód — naskenuješ ho v bankovní appce. Jako VS uveď číslo objednávky. |
| Hotově | Zdarma. **Jen při osobním odběru** na Žižkově. |

**Kartou ani přes Apple/Google Pay zaplatit nejde** a v dohledné době nepůjde — viz README
(sekce „Platby"): kuřácké potřeby jsou u karetních bran zakázaná kategorie, takže to není
otázka volby brány. Dobírku ani kurýra na adresu zatím nenabízíme.

> Text o QR kódu platí, jen když je v *Nastavení → Platby → Převodem* vyplněný účet
> a zapnuté zobrazení QR kódu. Stejný slib dopisuje do pokladny `checkoutPayHints()`
> v `src/js/shoptet-enhance.js` — kdyby QR zapnuté nebylo, oba texty lžou.

## Dodací podmínky

- O expedici a předání dopravci informujeme e-mailem.
- Zkontrolujte zásilku při převzetí; zjevné poškození řešte s dopravcem.

> Konkrétní ceny a dostupné metody se zobrazí v košíku podle zvolené dopravy.
> Prodej pouze osobám starším 18 let.
