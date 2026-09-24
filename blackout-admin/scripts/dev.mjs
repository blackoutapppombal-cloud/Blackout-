import './build.mjs';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT || 4173);
const types = {'.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const requested = path.resolve(root, `.${pathname}`);
    let target = requested.startsWith(root) ? requested : path.join(root, 'index.html');
    try {
      if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
    } catch {
      target = path.join(root, 'index.html');
    }
    const body = await readFile(target);
    response.writeHead(200, {'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});
    response.end(body);
  } catch (error) {
    response.writeHead(500, {'Content-Type':'text/plain; charset=utf-8'});
    response.end(error.message);
  }
}).listen(port, () => console.log(`BLACKOUT Admin: http://localhost:${port}`));
