// Mapování a pravidla převodu WooCommerce → Shoptet.
// Vše, co se může lišit dle konkrétního e-shopu, je tady (ne ve skriptech).

import { config } from '../lib/env.mjs';
import { collapseWhitespace, stripTags, truncateAtWord } from '../lib/util.mjs';

// Kategorie (dle slugu) vyřazené z migrace — i s jejich produkty.
// Volba klienta: odstranit konzumovatelné CBD, ponechat hardware.
const EXCLUDED_CATEGORY_SLUGS = new Set(['extrakty-oleje-cbd', 'kvety', 'cbd']);

export function isExcludedCategory(slug) {
	return EXCLUDED_CATEGORY_SLUGS.has(slug);
}

const META_MAX = 158;
const META_TAIL = 'Skladem u Budman.';

// Ořízne text na hranici VĚTY (ne uprostřed). Fallback: čárka + …, pak slovo + …
function trimToSentence(text, max) {
	const s = collapseWhitespace(text);
	if (!s) return '';
	if (s.length <= max) return s;
	const slice = s.slice(0, max + 1);
	let cut = -1;
	for (const m of slice.matchAll(/[.!?](\s|$)/g)) cut = m.index + 1;
	if (cut > max * 0.5) return s.slice(0, cut).trim();
	const comma = slice.lastIndexOf(', ');
	if (comma > max * 0.5) return s.slice(0, comma).trim() + '…';
	return truncateAtWord(s, max - 1) + '…';
}

// Sestaví SEO title (~60) a meta description (~158) z reálných dat produktu.
// Compliance: pokud zdroj obsahuje zdravotní tvrzení, text nepoužije.
export function buildSeo({ name, shortHtml, longHtml }) {
	const cleanName = collapseWhitespace(name);
	const suffix = ' | Budman';
	const seoTitle =
		cleanName.length + suffix.length <= 60
			? cleanName + suffix
			: cleanName.length <= 60
				? cleanName
				: truncateAtWord(cleanName, 60);

	let source = stripTags(shortHtml) || stripTags(longHtml);
	if (source && scanHealthClaims(source).length) source = '';

	let meta = trimToSentence(source, META_MAX);
	// Krátké meta doplnit o benefit, ať není „hluché".
	if (meta && meta.length < 95) {
		const withTail = meta.replace(/[.…]?$/, '.') + ' ' + META_TAIL;
		if (withTail.length <= META_MAX) meta = withTail;
	}
	if (!meta) {
		meta = trimToSentence(`${cleanName} — headshop gear u Budman. ${META_TAIL} Doprava od 1 500 Kč zdarma.`, META_MAX);
	}
	// Ať meta vždy končí větou.
	if (meta && !/[.!?…]$/.test(meta)) meta += '.';
	return { seoTitle, metaDescription: meta };
}

// CBD compliance: výrazy naznačující léčebné/zdravotní účinky (zakázané claims).
// Sken je jen poradní — místa k ruční úpravě, nic se nemaže automaticky.
const HEALTH_CLAIM_TERMS = [
	'léčb', 'léčí', 'léčiv', 'léčebn', 'terapeut', 'uzdrav', 'hojení', 'hojiv',
	'rakovin', 'zánět', 'protizánětliv', 'úzkost', 'depres', 'nespavost', 'spánek',
	'imunit', 'onemocněn', 'analget', 'antivir', 'bolest', 'zdraví', 'zdravotní',
];

// Vrátí pole nalezených rizikových výrazů v textu (po odstranění HTML).
export function scanHealthClaims(html) {
	const text = stripTags(html).toLowerCase();
	if (!text) return [];
	return [...new Set(HEALTH_CLAIM_TERMS.filter((t) => text.includes(t)))];
}

// Názvy Woo atributů, které reprezentují výrobce/značku (case-insensitive).
const BRAND_ATTRIBUTE_NAMES = ['značka', 'znacka', 'výrobce', 'vyrobce', 'brand', 'manufacturer'];

// Možné klíče meta pole s EAN (různé pluginy je ukládají jinak).
const EAN_META_KEYS = ['_ean', 'ean', '_wpm_gtin_code', '_alg_ean', '_gtin', 'hwp_var_gtin', '_global_unique_id'];

// Woo atributy, které NEjsou varianty/parametry pro Shoptet (přeskočit při tvorbě variant:*).
const ATTRIBUTE_BLOCKLIST = new Set([...BRAND_ATTRIBUTE_NAMES]);

// --- Značka --------------------------------------------------------------
export function resolveManufacturer(wooProduct) {
	// 1) Brands plugin / taxonomie
	if (Array.isArray(wooProduct.brands) && wooProduct.brands.length) {
		return collapseWhitespace(wooProduct.brands[0]?.name);
	}
	// 2) Atribut se jménem značky
	for (const attr of wooProduct.attributes || []) {
		const name = (attr.name || '').toLowerCase();
		if (BRAND_ATTRIBUTE_NAMES.includes(name)) {
			const opts = attr.options || (attr.option ? [attr.option] : []);
			if (opts.length) return collapseWhitespace(opts[0]);
		}
	}
	return '';
}

// --- EAN -----------------------------------------------------------------
export function resolveEan(wooProduct) {
	if (wooProduct.global_unique_id) return collapseWhitespace(wooProduct.global_unique_id);
	for (const meta of wooProduct.meta_data || []) {
		if (EAN_META_KEYS.includes(meta.key) && meta.value) {
			return collapseWhitespace(String(meta.value));
		}
	}
	return '';
}

// --- Varianty: které atributy z variace brát jako parametry --------------
export function isVariantParam(attributeName) {
	return !ATTRIBUTE_BLOCKLIST.has((attributeName || '').toLowerCase());
}

// --- URL: staré Woo (zdroj redirectu) ------------------------------------
export function wooProductUrl(slug, permalink) {
	if (permalink) {
		try {
			return ensureTrailingSlash(new URL(permalink).pathname);
		} catch {
			/* spadne na sestavení z prefixu */
		}
	}
	return ensureTrailingSlash(`${config.woo.productPrefix}/${slug}`);
}

export function wooCategoryUrl(slug) {
	return ensureTrailingSlash(`${config.woo.categoryPrefix}/${slug}`);
}

// --- URL: nové Shoptet (cíl redirectu) -----------------------------------
export function shoptetProductUrl(slug) {
	return ensureTrailingSlash(`/${slug}`);
}

export function shoptetCategoryUrl(slug) {
	if (config.shoptet.categoryUrlMode === 'prefix') {
		return ensureTrailingSlash(`/kategorie/${slug}`);
	}
	return ensureTrailingSlash(`/${slug}`);
}

function ensureTrailingSlash(p) {
	let s = p.startsWith('/') ? p : `/${p}`;
	if (!s.endsWith('/')) s += '/';
	return s.replace(/\/{2,}/g, '/');
}
