// Vyřízne rig z fotky na černém pozadí do transparentního PNG (klíčování černé do alfy).
// Pure-JS dekód (jpeg-js) + enkód (pngjs) — spolehlivé, bez browser dekódovacích anomálií.
//   node tools/rig-cutout.mjs assets/hero/rig.jpg assets/hero/rig.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const inPath = path.join(ROOT, process.argv[2] || 'assets/hero/rig.jpg');
const outPath = path.join(ROOT, process.argv[3] || 'assets/hero/rig.png');

const raw = jpeg.decode(fs.readFileSync(inPath), { useTArray: true });
const { width: W, height: H, data: s } = raw; // s = RGBA

function sample(fx, fy) { const o = (Math.round(H * fy) * W + Math.round(W * fx)) * 4; return [s[o], s[o + 1], s[o + 2]]; }
console.log('edge(source):', JSON.stringify({ l: sample(0.05, 0.5), r: sample(0.95, 0.5), tl: sample(0.02, 0.02), c: sample(0.5, 0.5) }));

// 1) klíčování alfy + nulování RGB na pozadí
const a = new Uint8Array(W * H);
let minX = W, minY = H, maxX = 0, maxY = 0;
for (let y = 0; y < H; y++) {
	for (let x = 0; x < W; x++) {
		const i = (y * W + x) * 4;
		const r = s[i], g = s[i + 1], b = s[i + 2];
		const m = Math.max(r, g, b), mn = Math.min(r, g, b), chroma = m - mn;
		let av;
		if (m < 16) av = 0;
		else { let t = (m - 14) / (80 - 14); t = t < 0 ? 0 : t > 1 ? 1 : t; av = Math.round(t * t * (3 - 2 * t) * 255); }
		const fx = x / W;
		if ((fx < 0.26 || fx > 0.74) && chroma < 18) av = 0; // kraje: zabij šedé/bílé pozadí (rig je uprostřed)
		a[y * W + x] = av;
		if (av > 60) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
	}
}

// 2) ořez na rig + 5% padding
const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.05);
minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad); maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
const cw = maxX - minX + 1, ch = maxY - minY + 1;

// 3) náustek = nejvyšší opaque pixel v horní čtvrtině (pro emitor dýmu)
let topY = ch, topXsum = 0, topN = 0;
for (let y = 0; y < Math.round(ch * 0.28); y++) for (let x = 0; x < cw; x++) {
	if (a[(minY + y) * W + (minX + x)] > 130) { if (y < topY) topY = y; topXsum += x; topN++; }
}
const mouthX = topN ? +(topXsum / topN / cw).toFixed(3) : 0.5;
const mouthY = +((topY / ch) + 0.03).toFixed(3);

// 4) sestav PNG
const png = new PNG({ width: cw, height: ch });
let whiteMid = 0; const midY = Math.round(ch * 0.5);
for (let y = 0; y < ch; y++) {
	for (let x = 0; x < cw; x++) {
		const si = ((minY + y) * W + (minX + x)) * 4;
		const av = a[(minY + y) * W + (minX + x)];
		const di = (y * cw + x) * 4;
		if (av === 0) { png.data[di] = 0; png.data[di + 1] = 0; png.data[di + 2] = 0; png.data[di + 3] = 0; }
		else {
			png.data[di] = s[si]; png.data[di + 1] = s[si + 1]; png.data[di + 2] = s[si + 2]; png.data[di + 3] = av;
			if (y === midY && av > 200 && s[si] > 230 && s[si + 1] > 230 && s[si + 2] > 230) whiteMid++;
		}
	}
}
fs.writeFileSync(outPath, PNG.sync.write(png));
console.log(`✓ ${path.relative(ROOT, outPath)} — crop ${cw}x${ch}, mouth(${mouthX}, ${mouthY}), whiteColsMidRow ${whiteMid}, ${fs.statSync(outPath).size} B`);
