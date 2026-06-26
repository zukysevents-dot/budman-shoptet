// Nasype ukázkový fixture do data/raw/, aby šlo otestovat transform→build→validate bez Woo API.
// Použití:  npm run seed:fixture   →   npm run build:all

import path from 'node:path';
import fs from 'node:fs';
import { FIXTURES_DIR, RAW_DIR, ensureDir, log } from './util.mjs';

ensureDir(RAW_DIR);
for (const f of ['woo-products.json', 'woo-categories.json']) {
	fs.copyFileSync(path.join(FIXTURES_DIR, f), path.join(RAW_DIR, f));
	log.ok(`fixture → data/raw/${f}`);
}
log.info('Hotovo. Teď spusť: npm run build:all');
