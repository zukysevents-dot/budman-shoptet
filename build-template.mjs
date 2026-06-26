// Build šablony bez závislostí: spojí všechny src/css/*.css a src/js/*.js
// do assets/budman.css a assets/budman.js + verzovací hash pro cache-busting.
// Výstup nahraješ na Shoptet FTP do /user/documents/ a odkážeš v Návrháři šablon.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(ROOT, 'assets');
fs.mkdirSync(ASSETS, { recursive: true });

// Spojí soubory dané přípony ze složky (seřazené dle názvu) do jednoho výstupu.
function bundle(srcDir, ext, outName) {
	const dir = path.join(ROOT, srcDir);
	const files = fs
		.readdirSync(dir)
		.filter((f) => f.endsWith(ext))
		.sort();
	const parts = files.map((f) => {
		const body = fs.readFileSync(path.join(dir, f), 'utf8');
		return `/* ${srcDir}/${f} */\n${body}`;
	});
	const out = parts.join('\n\n');
	fs.writeFileSync(path.join(ASSETS, outName), out, 'utf8');
	const hash = crypto.createHash('md5').update(out).digest('hex').slice(0, 8);
	console.log(`✓ ${srcDir}/*${ext} (${files.length}) → assets/${outName} (${out.length} B, v=${hash})`);
	return hash;
}

const cssV = bundle('src/css', '.css', 'budman.css');
const jsV = bundle('src/js', '.js', 'budman.js');

fs.writeFileSync(path.join(ASSETS, 'version.json'), JSON.stringify({ css: cssV, js: jsV }, null, 2));

console.log('\nVlož do Shoptet → Návrhář šablon → HTML kódy (záhlaví):');
console.log(`  <link rel="stylesheet" href="/user/documents/budman.css?v=${cssV}">`);
console.log(`  <script src="/user/documents/budman.js?v=${jsV}" defer></script>`);
