// Build šablony bez závislostí: src/ → assets/ + verzovací hash pro cache-busting.
// Výstup nahraješ na Shoptet FTP do /user/documents/ a odkážeš v Návrháři šablon.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(ROOT, 'assets');
fs.mkdirSync(ASSETS, { recursive: true });

function copy(srcRel, outName) {
	const src = path.join(ROOT, srcRel);
	const buf = fs.readFileSync(src);
	fs.writeFileSync(path.join(ASSETS, outName), buf);
	const hash = crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);
	console.log(`✓ ${srcRel} → assets/${outName} (${buf.length} B, v=${hash})`);
	return hash;
}

const cssV = copy('src/css/budman.css', 'budman.css');
const jsV = copy('src/js/budman.js', 'budman.js');

const version = { css: cssV, js: jsV, builtFrom: 'src/' };
fs.writeFileSync(path.join(ASSETS, 'version.json'), JSON.stringify(version, null, 2));

console.log('\nVlož do Shoptet → Návrhář šablon → HTML kódy (záhlaví):');
console.log(`  <link rel="stylesheet" href="/user/documents/budman.css?v=${cssV}">`);
console.log(`  <script src="/user/documents/budman.js?v=${jsV}" defer></script>`);
