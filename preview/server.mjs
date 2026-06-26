// Mini statický server jen pro lokální náhled (npm-free). Kořen = repo.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8742;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml' };

http
	.createServer((req, res) => {
		let p = decodeURIComponent(req.url.split('?')[0]);
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
