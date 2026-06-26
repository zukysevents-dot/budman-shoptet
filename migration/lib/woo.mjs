// Minimalistický klient pro WooCommerce REST API (wc/v3). Bez závislostí (Node 20 fetch).

import { config } from './env.mjs';
import { log } from './util.mjs';

function authHeader() {
	const token = Buffer.from(`${config.woo.key}:${config.woo.secret}`).toString('base64');
	return `Basic ${token}`;
}

async function wooFetch(endpoint, params = {}) {
	const url = new URL(`${config.woo.url}/wp-json/wc/v3/${endpoint}`);
	for (const [k, v] of Object.entries(params)) {
		if (v !== undefined && v !== null) url.searchParams.set(k, v);
	}
	const res = await fetch(url, {
		headers: { Authorization: authHeader(), Accept: 'application/json' },
	});
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new Error(`Woo API ${res.status} ${res.statusText} na ${endpoint}\n${body.slice(0, 500)}`);
	}
	return {
		data: await res.json(),
		totalPages: Number(res.headers.get('x-wp-totalpages') || '1'),
		total: Number(res.headers.get('x-wp-total') || '0'),
	};
}

// Stáhne všechny stránky daného endpointu (per_page=100).
async function fetchAllPages(endpoint, params = {}) {
	const all = [];
	let page = 1;
	let totalPages = 1;
	do {
		const { data, totalPages: tp } = await wooFetch(endpoint, { per_page: 100, page, ...params });
		all.push(...data);
		totalPages = tp;
		log.info(`  ${endpoint}: stránka ${page}/${totalPages} (+${data.length})`);
		page += 1;
	} while (page <= totalPages);
	return all;
}

export async function fetchProducts() {
	// status=publish → migrujeme jen zveřejněné produkty (drafty ne).
	return fetchAllPages('products', { status: 'publish' });
}

export async function fetchVariations(productId) {
	return fetchAllPages(`products/${productId}/variations`);
}

export async function fetchProductCategories() {
	return fetchAllPages('products/categories', { hide_empty: false });
}
