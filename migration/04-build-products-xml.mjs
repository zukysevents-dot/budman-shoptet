// 04 — Build importu produktů.
// Generuje DVA artefakty:
//   out/products.csv  — PRIMÁRNÍ. Shoptet import má průvodce s mapováním sloupců,
//                        takže přesné názvy sloupců nejsou kritické (mapuje uživatel).
//   out/products.xml  — SEKUNDÁRNÍ/volitelný. Nese <ORIG_URL> pro auto-301.
//                        Názvy elementů ověř ve validátoru, viz runbook.

import path from 'node:path';
import { NORM_DIR, OUT_DIR, readJSON, writeText, toCSV, fileExists, log, xmlCData, xmlEscape } from './lib/util.mjs';

function collectParamNames(rows) {
	const names = [];
	for (const r of rows) {
		for (const k of Object.keys(r.params || {})) {
			if (!names.includes(k)) names.push(k);
		}
	}
	return names;
}

function maxImages(rows) {
	return rows.reduce((m, r) => Math.max(m, (r.images || []).length), 0);
}

function availabilityLabel(r) {
	return r.inStock ? 'Skladem' : 'Nedostupné';
}

// --- CSV -----------------------------------------------------------------
function buildCSV(rows) {
	const paramNames = collectParamNames(rows);
	const imgCount = Math.min(maxImages(rows), 10);

	const columns = [
		'code',
		'pairCode',
		'name',
		'url',
		'manufacturer',
		'ean',
		'defaultCategory',
		'price',
		'vatRate',
		'includingVat',
		'actionPrice',
		'actionFrom',
		'actionUntil',
		'weight',
		'availability',
		'stock',
		'shortDescription',
		'description',
		'seoTitle',
		'metaDescription',
		...paramNames.map((n) => `variant:${n}`),
		'image',
		...Array.from({ length: Math.max(0, imgCount - 1) }, (_, i) => `image${i + 2}`),
	];

	const csvRows = rows.map((r) => {
		const row = {
			code: r.code,
			pairCode: r.pairCode,
			name: r.name,
			url: r.slug,
			manufacturer: r.manufacturer,
			ean: r.ean,
			defaultCategory: r.defaultCategory,
			price: r.price,
			vatRate: r.vatRate,
			includingVat: r.includingVat,
			actionPrice: r.actionPrice,
			actionFrom: r.actionFrom,
			actionUntil: r.actionUntil,
			weight: r.weight,
			availability: availabilityLabel(r),
			stock: r.stock,
			shortDescription: r.shortDescription,
			description: r.description,
			seoTitle: r.seoTitle,
			metaDescription: r.metaDescription,
		};
		for (const n of paramNames) row[`variant:${n}`] = r.params?.[n] || '';
		(r.images || []).slice(0, imgCount).forEach((url, i) => {
			row[i === 0 ? 'image' : `image${i + 1}`] = url;
		});
		return row;
	});

	return toCSV(columns, csvRows);
}

// --- XML (best-effort, ověřit ve validátoru) -----------------------------
function buildXML(rows) {
	// Skupiny: varianty dle pairCode, jednoduché produkty samostatně.
	const groups = new Map();
	for (const r of rows) {
		const key = r.pairCode ? `pair:${r.pairCode}` : `single:${r.code}`;
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key).push(r);
	}

	const el = (tag, val) => (val === '' || val === null || val === undefined ? '' : `<${tag}>${xmlEscape(val)}</${tag}>`);
	const items = [];

	for (const group of groups.values()) {
		const head = group[0];
		const isVariant = Boolean(head.pairCode);
		const imgs = (head.images || []).map((u) => `      <IMAGE>${xmlEscape(u)}</IMAGE>`).join('\n');

		const common = [
			`    <CODE>${xmlEscape(isVariant ? head.pairCode : head.code)}</CODE>`,
			`    <PRODUCTNAME>${xmlEscape(head.name)}</PRODUCTNAME>`,
			head.manufacturer ? `    <MANUFACTURER>${xmlEscape(head.manufacturer)}</MANUFACTURER>` : '',
			head.defaultCategory ? `    <CATEGORIES>\n      <CATEGORY>${xmlEscape(head.defaultCategory)}</CATEGORY>\n    </CATEGORIES>` : '',
			head.shortDescription ? `    <SHORT_DESCRIPTION>${xmlCData(head.shortDescription)}</SHORT_DESCRIPTION>` : '',
			head.description ? `    <DESCRIPTION>${xmlCData(head.description)}</DESCRIPTION>` : '',
			head.seoTitle ? `    <SEO_TITLE>${xmlEscape(head.seoTitle)}</SEO_TITLE>` : '',
			head.metaDescription ? `    <META_DESCRIPTION>${xmlEscape(head.metaDescription)}</META_DESCRIPTION>` : '',
			head.origUrl ? `    <ORIG_URL>${xmlEscape(head.origUrl)}</ORIG_URL>` : '',
			`    <VAT>${xmlEscape(head.vatRate)}</VAT>`,
			imgs ? `    <IMAGES>\n${imgs}\n    </IMAGES>` : '',
		].filter(Boolean);

		if (!isVariant) {
			common.push(`    ${el('PRICE', head.price)}`.trimEnd());
			if (head.actionPrice !== '') common.push(`    <ACTION_PRICE>${xmlEscape(head.actionPrice)}</ACTION_PRICE>`);
			common.push(`    <STOCK>${xmlEscape(head.stock === '' ? (head.inStock ? 1 : 0) : head.stock)}</STOCK>`);
		} else {
			const variants = group
				.map((v) => {
					const params = Object.entries(v.params || {})
						.map(([n, val]) => `        <PARAMETER>\n          <NAME>${xmlEscape(n)}</NAME>\n          <VALUE>${xmlEscape(val)}</VALUE>\n        </PARAMETER>`)
						.join('\n');
					return [
						`      <VARIANT>`,
						`        <CODE>${xmlEscape(v.code)}</CODE>`,
						params ? `        <PARAMETERS>\n${params}\n        </PARAMETERS>` : '',
						`        <PRICE>${xmlEscape(v.price)}</PRICE>`,
						v.actionPrice !== '' ? `        <ACTION_PRICE>${xmlEscape(v.actionPrice)}</ACTION_PRICE>` : '',
						`        <STOCK>${xmlEscape(v.stock === '' ? (v.inStock ? 1 : 0) : v.stock)}</STOCK>`,
						`      </VARIANT>`,
					]
						.filter(Boolean)
						.join('\n');
				})
				.join('\n');
			common.push(`    <VARIANTS>\n${variants}\n    </VARIANTS>`);
		}

		items.push(`  <SHOPITEM>\n${common.join('\n')}\n  </SHOPITEM>`);
	}

	return (
		'<?xml version="1.0" encoding="utf-8"?>\n' +
		'<!-- POZOR: názvy elementů ověř ve validátoru Shoptetu (podpora.shoptet.cz/xml-validace/) -->\n' +
		'<!-- a sjednoť s aktuálním RELAX NG schématem před importem. Primární cesta importu je products.csv. -->\n' +
		'<SHOP>\n' +
		items.join('\n') +
		'\n</SHOP>\n'
	);
}

function main() {
	log.step('04 Build produktů (CSV + XML)');

	const file = path.join(NORM_DIR, 'products.json');
	if (!fileExists(file)) throw new Error(`Chybí ${file}. Spusť napřed "npm run transform".`);
	const rows = readJSON(file);

	const csvOut = path.join(OUT_DIR, 'products.csv');
	writeText(csvOut, buildCSV(rows), { withBom: true });
	log.ok(`${rows.length} řádků → ${csvOut}`);

	const xmlOut = path.join(OUT_DIR, 'products.xml');
	writeText(xmlOut, buildXML(rows));
	log.ok(`→ ${xmlOut} (sekundární, ověřit ve validátoru)`);
}

try {
	main();
} catch (err) {
	log.err(err.message);
	process.exitCode = 1;
}
