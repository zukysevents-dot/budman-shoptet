// 02 — Transformace a čištění: data/raw/ → data/normalized/.
// Variabilní produkty se rozbalí na řádky variant se sdíleným pairCode.
// Nic se nevymýšlí: chybějící popisy se nevygenerují, jen zaznamenají do reportu.

import path from 'node:path';
import {
	RAW_DIR,
	NORM_DIR,
	readJSON,
	writeJSON,
	fileExists,
	log,
	slugify,
	sanitizeCode,
	sanitizePairCode,
	collapseWhitespace,
	stripTags,
	parsePrice,
	toDateOnly,
} from './lib/util.mjs';
import { config } from './lib/env.mjs';
import { resolveManufacturer, resolveEan, isVariantParam, wooProductUrl } from './config/mapping.mjs';

const warnings = [];
const warn = (code, msg, ref) => warnings.push({ code, msg, ref });

// --- Kategorie -----------------------------------------------------------
function buildCategories(rawCats) {
	const byId = new Map(rawCats.map((c) => [c.id, c]));
	const depth = (c) => {
		let d = 0;
		let cur = c;
		while (cur && cur.parent) {
			cur = byId.get(cur.parent);
			d += 1;
			if (d > 20) break;
		}
		return d;
	};
	const cats = rawCats
		.map((c) => ({
			id: c.id,
			title: collapseWhitespace(c.name),
			slug: c.slug,
			parentSlug: c.parent ? byId.get(c.parent)?.slug || '' : '',
			description: (c.description || '').trim(),
			depth: depth(c),
		}))
		// Rodiče první (kvůli parentUrl při importu).
		.sort((a, b) => a.depth - b.depth || a.title.localeCompare(b.title, 'cs'));
	return { cats, byId };
}

// Vybere nejhlubší (nejkonkrétnější) kategorii produktu jako defaultCategory.
function pickDefaultCategory(productCats, catBySlug) {
	let best = null;
	for (const pc of productCats || []) {
		const cat = catBySlug.get(pc.slug);
		const d = cat ? cat.depth : 0;
		if (!best || d > best.depth) best = { slug: pc.slug, title: collapseWhitespace(pc.name), depth: d };
	}
	return best;
}

// --- Obrázky -------------------------------------------------------------
function imageUrls(images) {
	return (images || []).map((img) => (typeof img === 'string' ? img : img?.src)).filter(Boolean);
}

// --- Sklad ---------------------------------------------------------------
function stockInfo(src) {
	const qty = src.stock_quantity;
	return {
		inStock: src.stock_status ? src.stock_status === 'instock' : true,
		stock: typeof qty === 'number' ? qty : '',
	};
}

// --- Hlavní převod -------------------------------------------------------
function main() {
	log.step('02 Transformace a čištění');

	const productsFile = path.join(RAW_DIR, 'woo-products.json');
	const catsFile = path.join(RAW_DIR, 'woo-categories.json');
	if (!fileExists(productsFile)) {
		throw new Error(
			`Chybí ${productsFile}. Spusť napřed "npm run export" (nebo "npm run seed:fixture" pro test bez API).`
		);
	}

	const rawProducts = readJSON(productsFile);
	const rawCats = fileExists(catsFile) ? readJSON(catsFile) : [];
	const { cats } = buildCategories(rawCats);
	const catBySlug = new Map(cats.map((c) => [c.slug, c]));

	const usedCodes = new Set();
	const uniqueCode = (base, ref) => {
		let code = sanitizeCode(base) || sanitizeCode('PROD-' + slugify(ref || 'x'));
		if (!code) code = 'PROD';
		let candidate = code;
		let i = 2;
		while (usedCodes.has(candidate)) {
			candidate = `${code}-${i++}`;
			warn('DUP_CODE', `Duplicitní kód "${code}" → použito "${candidate}"`, ref);
		}
		usedCodes.add(candidate);
		return candidate;
	};

	const rows = [];

	for (const p of rawProducts) {
		const baseSlug = p.slug || slugify(p.name);
		const origUrl = wooProductUrl(baseSlug, p.permalink);
		const defCat = pickDefaultCategory(p.categories, catBySlug);
		const manufacturer = resolveManufacturer(p);
		const parentImages = imageUrls(p.images);
		const shortDesc = (p.short_description || '').trim();
		const longDesc = (p.description || '').trim();

		if (!shortDesc) warn('NO_SHORT_DESC', `Chybí krátký popis: ${p.name}`, origUrl);
		if (!defCat) warn('NO_CATEGORY', `Produkt bez kategorie: ${p.name}`, origUrl);

		const isVariable = p.type === 'variable' && Array.isArray(p._variations) && p._variations.length > 0;

		if (!isVariable) {
			const regular = parsePrice(p.regular_price) ?? parsePrice(p.price);
			const sale = parsePrice(p.sale_price);
			if (regular === null || regular <= 0) warn('NO_PRICE', `Chybí/nulová cena: ${p.name}`, origUrl);
			if (parentImages.length === 0) warn('NO_IMAGE', `Bez obrázku: ${p.name}`, origUrl);

			rows.push({
				code: uniqueCode(p.sku || baseSlug, origUrl),
				pairCode: '',
				name: collapseWhitespace(p.name),
				slug: baseSlug,
				manufacturer,
				ean: resolveEan(p),
				defaultCategory: defCat?.title || '',
				defaultCategorySlug: defCat?.slug || '',
				price: regular ?? '',
				vatRate: config.vatRate,
				includingVat: config.pricesIncludeVat ? 1 : 0,
				actionPrice: sale !== null && regular !== null && sale < regular ? sale : '',
				actionFrom: toDateOnly(p.date_on_sale_from),
				actionUntil: toDateOnly(p.date_on_sale_to),
				weight: p.weight || '',
				shortDescription: shortDesc,
				description: longDesc,
				params: {},
				images: parentImages,
				origUrl,
				...stockInfo(p),
			});
			continue;
		}

		// Variabilní produkt → řádky variant se sdíleným pairCode.
		const pairCode = sanitizePairCode(p.sku || baseSlug) || sanitizePairCode('VAR' + p.id);
		for (const v of p._variations) {
			const regular = parsePrice(v.regular_price) ?? parsePrice(v.price);
			const sale = parsePrice(v.sale_price);
			const vImages = imageUrls(v.image ? [v.image] : []);
			const params = {};
			for (const attr of v.attributes || []) {
				if (isVariantParam(attr.name) && attr.option) params[collapseWhitespace(attr.name)] = collapseWhitespace(attr.option);
			}
			if (Object.keys(params).length > 3) warn('TOO_MANY_PARAMS', `>3 parametry (Shoptet max 3): ${p.name}`, origUrl);
			if (!v.sku) warn('NO_VARIANT_SKU', `Varianta bez SKU: ${p.name} (${Object.values(params).join('/')})`, origUrl);
			if (regular === null || regular <= 0) warn('NO_PRICE', `Varianta bez ceny: ${p.name}`, origUrl);

			rows.push({
				code: uniqueCode(v.sku || `${pairCode}-${Object.values(params).map(slugify).join('-')}`, origUrl),
				pairCode,
				name: collapseWhitespace(p.name),
				slug: baseSlug,
				manufacturer,
				ean: resolveEan(v) || resolveEan(p),
				defaultCategory: defCat?.title || '',
				defaultCategorySlug: defCat?.slug || '',
				price: regular ?? '',
				vatRate: config.vatRate,
				includingVat: config.pricesIncludeVat ? 1 : 0,
				actionPrice: sale !== null && regular !== null && sale < regular ? sale : '',
				actionFrom: toDateOnly(v.date_on_sale_from),
				actionUntil: toDateOnly(v.date_on_sale_to),
				weight: v.weight || p.weight || '',
				shortDescription: shortDesc,
				description: longDesc,
				params,
				images: vImages.length ? [...vImages, ...parentImages] : parentImages,
				origUrl,
				...stockInfo(v),
			});
		}
	}

	writeJSON(path.join(NORM_DIR, 'products.json'), rows);
	writeJSON(path.join(NORM_DIR, 'categories.json'), cats);
	writeJSON(path.join(NORM_DIR, 'report.json'), {
		generatedFrom: 'data/raw/woo-products.json',
		counts: {
			rawProducts: rawProducts.length,
			outputRows: rows.length,
			variantRows: rows.filter((r) => r.pairCode).length,
			categories: cats.length,
		},
		warnings,
	});

	log.ok(`Řádků produktů: ${rows.length} (z toho variant: ${rows.filter((r) => r.pairCode).length})`);
	log.ok(`Kategorií: ${cats.length}`);
	if (warnings.length) log.warn(`Upozornění: ${warnings.length} (detail v normalized/report.json)`);
	else log.ok('Bez upozornění.');
}

try {
	main();
} catch (err) {
	log.err(err.message);
	process.exitCode = 1;
}
