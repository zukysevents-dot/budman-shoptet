// Mini statický server jen pro lokální náhled (npm-free). Kořen = repo.
// Navíc POST /save?path=... uloží base64 PNG tělo (pro extrakci loga z PDF).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8742;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf' };

http
	.createServer((req, res) => {
		const u = new URL(req.url, `http://localhost:${PORT}`);

		if (req.method === 'POST' && u.pathname === '/save') {
			const rel = u.searchParams.get('path') || '';
			const dest = path.join(ROOT, rel);
			if (!dest.startsWith(ROOT)) {
				res.writeHead(400);
				res.end('bad path');
				return;
			}
			let body = '';
			req.on('data', (c) => (body += c));
			req.on('end', () => {
				const b64 = body.replace(/^data:image\/\w+;base64,/, '');
				fs.mkdirSync(path.dirname(dest), { recursive: true });
				fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
				res.writeHead(200);
				res.end('saved ' + rel + ' (' + Math.round(Buffer.from(b64, 'base64').length / 1024) + ' kB)');
			});
			return;
		}

		let p = decodeURIComponent(u.pathname);
		if (p === '/') p = '/preview/index.html';
		const file = path.join(ROOT, p);
		if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
			res.writeHead(404);
			res.end('not found');
			return;
		}
		res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
		fs.createReadStream(file).pipe(res);
	})
	.listen(PORT, () => console.log(`preview na http://localhost:${PORT}/preview/index.html`));
