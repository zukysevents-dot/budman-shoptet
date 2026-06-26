// 06 — Validace před importem. Kontroluje normalizovaná data i existenci výstupů.
// Volitelně ověří dosažitelnost obrázků:  node migration/06-validate.mjs --check-images
// Skončí kódem 1, pokud najde tvrdé chyby (blokující import).

import path from 'node:path';
import { NORM_DIR, OUT_DIR, readJSON, fileExists, log } from './lib/util.mjs';

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

function checkUniqueCodes(rows) {
	const seen = new Map();
	for (const r of rows) {
		if (seen.has(r.code)) err(`Duplicitní code "${r.code}" (${r.name})`);
		seen.set(r.code, true);
	}
}

function checkVariantBlocks(rows) {
	// pairCode musí být v jednom souvislém bloku řádků.
	const seq = rows.map((r, i) => (r.pairCode ? `P:${r.pairCode}` : `S:${i}`));
	const collapsed = [];
	for (const k of seq) if (collapsed[collapsed.length - 1] !== k) collapsed.push(k);
	const counts = {};
	for (const k of collapsed) counts[k] = (counts[k] || 0) + 1;
	for (const [k, c] of Object.entries(counts)) {
		if (k.startsWith('P:') && c > 1) err(`pairCode "${k.slice(2)}" není v souvislém bloku (varianty musí být vedle sebe)`);
	}
}

function checkPrices(rows) {
	for (const r of rows) {
		const price = Number(r.price);
		if (!(price > 0)) err(`Neplatná cena u "${r.name}" (code ${r.code}): "${r.price}"`);
		if (![0, 1].includes(Number(r.includingVat))) err(`includingVat musí být 0/1 u ${r.code}`);
		if (r.actionPrice !== '' && Number(r.actionPrice) >= price) warn(`Akční cena ≥ cena u "${r.name}" (${r.code})`);
		if (Object.keys(r.params || {}).length > 3) err(`>3 parametry (Shoptet max 3) u "${r.name}"`);
	}
}

function checkCategories(rows, cats) {
	const slugs = new Set(cats.map((c) => c.slug));
	for (const r of rows) {
		if (r.defaultCategorySlug && !slugs.has(r.defaultCategorySlug)) {
			warn(`Kategorie "${r.defaultCategorySlug}" produktu "${r.name}" není v seznamu kategorií`);
		}
		if (!r.defaultCategory) warn(`Produkt bez kategorie: ${r.name}`);
	}
	// parentSlug musí existovat
	for (const c of cats) {
		if (c.parentSlug && !slugs.has(c.parentSlug)) err(`Kategorie "${c.slug}" odkazuje na neexistujícího rodiče "${c.parentSlug}"`);
	}
}

function collectImageUrls(rows) {
	const urls = new Set();
	for (const r of rows) for (const u of r.images || []) urls.add(u);
	return [...urls];
}

function checkImageSyntax(rows) {
	for (const r of rows) {
		if (!(r.images || []).length) warn(`Bez obrázku: ${r.name} (${r.code})`);
		for (const u of r.images || []) {
			if (!/^https?:\/\//i.test(u)) err(`Nevalidní URL obrázku u ${r.code}: ${u}`);
			if (/\s/.test(u)) err(`URL obrázku obsahuje mezeru u ${r.code}: ${u}`);
		}
	}
}

async function checkImagesReachable(urls) {
	log.info(`Ověřuji dosažitelnost ${urls.length} obrázků…`);
	let bad = 0;
	const queue = [...urls];
	const workers = Array.from({ length: 8 }, async () => {
		while (queue.length) {
			const u = queue.pop();
			try {
				const res = await fetch(u, { method: 'HEAD' });
				if (!res.ok) {
					warn(`Obrázek nedostupný (${res.status}): ${u}`);
					bad += 1;
				}
			} catch (e) {
				warn(`Obrázek nedostupný (${e.message}): ${u}`);
				bad += 1;
			}
		}
	});
	await Promise.all(workers);
	log.info(`Nedostupných: ${bad}`);
}

function checkOutputs() {
	for (const f of ['products.csv', 'categories.csv', 'redirects.csv']) {
		const p = path.join(OUT_DIR, f);
		if (!fileExists(p)) warn(`Chybí výstup ${f} (spusť build:* skripty).`);
	}
}

async function main() {
	log.step('06 Validace');

	const pFile = path.join(NORM_DIR, 'products.json');
	const cFile = path.join(NORM_DIR, 'categories.json');
	if (!fileExists(pFile)) throw new Error(`Chybí ${pFile}. Spusť napřed "npm run transform".`);

	const rows = readJSON(pFile);
	const cats = fileExists(cFile) ? readJSON(cFile) : [];

	checkUniqueCodes(rows);
	checkVariantBlocks(rows);
	checkPrices(rows);
	checkCategories(rows, cats);
	checkImageSyntax(rows);
	checkOutputs();

	if (process.argv.includes('--check-images')) {
		await checkImagesReachable(collectImageUrls(rows));
	}

	console.log('');
	if (warns.length) {
		log.warn(`Upozornění (${warns.length}):`);
		for (const w of warns) console.log('   ! ' + w);
	}
	if (errors.length) {
		log.err(`Chyby (${errors.length}):`);
		for (const e of errors) console.log('   ✗ ' + e);
		log.err('Validace NEPROŠLA — oprav chyby před importem.');
		process.exitCode = 1;
	} else {
		log.ok(`Validace prošla. Produktů: ${rows.length}, kategorií: ${cats.length}, upozornění: ${warns.length}.`);
	}
}

main().catch((e) => {
	log.err(e.message);
	process.exitCode = 1;
});
