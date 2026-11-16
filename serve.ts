// A tiny static server for game/ (Node 22, standard library only), so the
// game can be played locally without a build step: `node serve.ts` serves
// game/ on http://localhost:8080 (use --port to pick another). It sends the
// MIME types a browser game needs and refuses any path outside game/; this
// is a development convenience, not a web server for the internet.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const requested = portIndex === -1 ? 8080 : Number(args[portIndex + 1]);
const port = Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
};

createServer((request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://localhost');
    let pathname = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
    if (pathname === '' || pathname.endsWith(sep)) pathname += 'index.html';
    const file = join(root, pathname);
    if (!file.startsWith(root + sep)) {
      response.writeHead(403);
      response.end('forbidden');
      return;
    }
    const stat = statSync(file);
    if (!stat.isFile()) {
      response.writeHead(404);
      response.end('not found');
      return;
    }
    response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404);
    response.end('not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Lentera Rimba on http://localhost:${port}`);
});
