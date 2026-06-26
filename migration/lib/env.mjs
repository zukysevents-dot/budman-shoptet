// Načtení konfigurace z process.env a z migration/config/.env (bez závislosti na dotenv).

import fs from 'node:fs';
import path from 'node:path';
import { MIGRATION_DIR } from './util.mjs';

function parseDotEnv(file) {
	const out = {};
	if (!fs.existsSync(file)) return out;
	const text = fs.readFileSync(file, 'utf8');
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.trim();
		if (!line || line.startsWith('#')) continue;
		const eq = line.indexOf('=');
		if (eq === -1) continue;
		const key = line.slice(0, eq).trim();
		let val = line.slice(eq + 1).trim();
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1);
		}
		out[key] = val;
	}
	return out;
}

const fileEnv = parseDotEnv(path.join(MIGRATION_DIR, 'config', '.env'));

function get(key, fallback = undefined) {
	return process.env[key] ?? fileEnv[key] ?? fallback;
}

export const config = {
	woo: {
		url: (get('WOO_URL') || '').replace(/\/+$/, ''),
		key: get('WOO_KEY') || '',
		secret: get('WOO_SECRET') || '',
		productPrefix: get('WOO_PRODUCT_PREFIX', '/produkt'),
		categoryPrefix: get('WOO_CATEGORY_PREFIX', '/kategorie-produktu'),
	},
	shoptet: {
		baseUrl: (get('SHOPTET_BASE_URL') || '').replace(/\/+$/, ''),
		categoryUrlMode: get('SHOPTET_CATEGORY_URL_MODE', 'none'), // none | prefix
	},
	currency: get('CURRENCY', 'CZK'),
	vatRate: Number(get('DEFAULT_VAT_RATE', '21')),
	pricesIncludeVat: get('PRICES_INCLUDE_VAT', '1') === '1',
};

export function requireWooCreds() {
	const { url, key, secret } = config.woo;
	if (!url || !key || !secret) {
		throw new Error(
			'Chybí WooCommerce přístupy. Zkopíruj migration/config/.env.example na .env a vyplň WOO_URL, WOO_KEY, WOO_SECRET.'
		);
	}
}
