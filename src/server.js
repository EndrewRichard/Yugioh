const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { router } = require('./routes');

const publicDir = path.join(__dirname, '..', 'public');
const mimeTypes = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.jpeg':'image/jpeg' };
const cardAssets = path.join(publicDir, 'assets', 'cards');

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) return await router(req, res);
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const cardImage = pathname.match(/^\/assets\/cards\/(\d+)\.jpg$/);
    if (cardImage) {
      const id = cardImage[1], filename = path.join(cardAssets, `${id}.jpg`);
      try { const cached = await fs.promises.readFile(filename); res.writeHead(200, { 'Content-Type':'image/jpeg', 'Cache-Control':'public, max-age=31536000, immutable' }); return res.end(cached); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      const response = await fetch(`https://images.ygoprodeck.com/images/cards_small/${id}.jpg`, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) { res.writeHead(404); return res.end('Image not found'); }
      const image = Buffer.from(await response.arrayBuffer());
      await fs.promises.mkdir(cardAssets, { recursive:true });
      await fs.promises.writeFile(filename, image);
      res.writeHead(200, { 'Content-Type':'image/jpeg', 'Cache-Control':'public, max-age=31536000, immutable' }); return res.end(image);
    }
    if (pathname === '/') pathname = '/index.html';
    const filename = path.resolve(publicDir, '.' + pathname);
    if (!filename.startsWith(publicDir + path.sep) && filename !== path.join(publicDir, 'index.html')) {
      res.writeHead(403); return res.end('Forbidden');
    }
    const body = await fs.promises.readFile(filename);
    res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filename)] || 'application/octet-stream', 'X-Content-Type-Options':'nosniff', 'Cache-Control':'no-cache' });
    res.end(body);
  } catch (error) {
    const status = error.status || (error.code === 'ENOENT' ? 404 : 500);
    res.writeHead(status, { 'Content-Type':'text/plain; charset=utf-8' });
    res.end(status === 404 ? 'Not found' : 'Server error');
    if (status >= 500) console.error(error);
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`Duelist pronto em http://localhost:${port}`));
