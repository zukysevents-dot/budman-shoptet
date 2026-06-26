// 05 — Build CSV 301 přesměrování (stará Woo URL → nová Shoptet URL).
// Sloupce: fromUrl;toUrl;automatic   (automatic=0 → ruční pravidlo)
// Slugy zachováváme → mění se jen prefix, mapa je deterministická.

import path from 'node:path';
import { NORM_DIR, OUT_DIR, readJSON, writeText, toCSV, fileExists, log } from './lib/util.mjs';
import {
	wooProductUrl,
	wooCategoryUrl,
	shoptetProductUrl,
	shoptetCategoryUrl,
} from './config/mapping.mjs';

function main() {
	log.step('05 Build přesměrování (CSV)');

	const pFile = path.join(NORM_DIR, 'products.json');
	const cFile = path.join(NORM_DIR, 'categories.json');
	if (!fileExists(pFile)) throw new Error(`Chybí ${pFile}. Spusť napřed "npm run transform".`);

	const rows = readJSON(pFile);
	const cats = fileExists(cFile) ? readJSON(cFile) : [];

	const seen = new Set();
	const out = [];
	const add = (fromUrl, toUrl) => {
		if (!fromUrl || !toUrl || fromUrl === toUrl || seen.has(fromUrl)) return;
		seen.add(fromUrl);
		out.push({ fromUrl, toUrl, automatic: 0 });
	};

	// Produkty (varianty sdílí jedno URL → deduplikace přes "seen").
	for (const r of rows) {
		add(r.origUrl || wooProductUrl(r.slug), shoptetProductUrl(r.slug));
	}

	// Kategorie
	for (const c of cats) {
		add(wooCategoryUrl(c.slug), shoptetCategoryUrl(c.slug));
	}

	// Vyřazené (CBD) → staré URL na homepage, ať nevznikne 404.
	const removedFile = path.join(NORM_DIR, 'removed.json');
	if (fileExists(removedFile)) {
		const removed = readJSON(removedFile);
		for (const u of removed.products || []) add(u, '/');
		for (const slug of removed.categories || []) add(wooCategoryUrl(slug), '/');
	}

	const columns = ['fromUrl', 'toUrl', 'automatic'];
	const file = path.join(OUT_DIR, 'redirects.csv');
	writeText(file, toCSV(columns, out), { withBom: true });
	log.ok(`${out.length} přesměrování → ${file}`);
	log.info('Obsahové stránky (OP, GDPR, …) doplň ručně dle docs/redirect-map.md.');
}

try {
	main();
} catch (err) {
	log.err(err.message);
	process.exitCode = 1;
}
