// 01 — Export z WooCommerce REST API do data/raw/.
// Idempotentní: opakované spuštění přepíše raw soubory aktuálním stavem e-shopu.

import path from 'node:path';
import { requireWooCreds } from './lib/env.mjs';
import { fetchProducts, fetchVariations, fetchProductCategories } from './lib/woo.mjs';
import { RAW_DIR, writeJSON, log } from './lib/util.mjs';

async function main() {
	requireWooCreds();

	log.step('01 Export z WooCommerce');

	log.info('Stahuji kategorie…');
	const categories = await fetchProductCategories();
	writeJSON(path.join(RAW_DIR, 'woo-categories.json'), categories);
	log.ok(`Kategorie: ${categories.length}`);

	log.info('Stahuji produkty…');
	const products = await fetchProducts();
	log.ok(`Produkty: ${products.length}`);

	// Pro variabilní produkty stáhnout varianty a přiložit je k produktu.
	let withVariants = 0;
	for (const p of products) {
		if (p.type === 'variable') {
			p._variations = await fetchVariations(p.id);
			withVariants += 1;
		} else {
			p._variations = [];
		}
	}
	log.ok(`Variabilní produkty: ${withVariants}`);

	writeJSON(path.join(RAW_DIR, 'woo-products.json'), products);
	log.ok(`Uloženo do ${RAW_DIR}`);
}

main().catch((err) => {
	log.err(err.message);
	process.exitCode = 1;
});
