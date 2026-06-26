// 03 — Build importního CSV kategorií pro Shoptet.
// Sloupce: title;url;parentUrl;description  (rodiče jsou v pořadí první).

import path from 'node:path';
import { NORM_DIR, OUT_DIR, readJSON, writeText, toCSV, fileExists, log } from './lib/util.mjs';

function main() {
	log.step('03 Build kategorií (CSV)');

	const file = path.join(NORM_DIR, 'categories.json');
	if (!fileExists(file)) throw new Error(`Chybí ${file}. Spusť napřed "npm run transform".`);

	const cats = readJSON(file);
	const columns = ['title', 'url', 'parentUrl', 'description'];
	const rows = cats.map((c) => ({
		title: c.title,
		url: c.slug,
		parentUrl: c.parentSlug || '',
		description: c.description || '',
	}));

	const out = path.join(OUT_DIR, 'categories.csv');
	writeText(out, toCSV(columns, rows), { withBom: true });
	log.ok(`${rows.length} kategorií → ${out}`);
}

try {
	main();
} catch (err) {
	log.err(err.message);
	process.exitCode = 1;
}
