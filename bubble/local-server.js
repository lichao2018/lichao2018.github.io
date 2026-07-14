const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = 8123;
const host = '0.0.0.0';
const configFilePath = path.join(root, 'game-config.json');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  if (urlPath === '/api/config') {
    if (req.method === 'GET') {
      fs.readFile(configFilePath, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Failed to read config' }));
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store'
        });
        res.end(data);
      });
      return;
    }

    if (req.method === 'PUT') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 1024 * 1024) {
          req.destroy();
        }
      });

      req.on('end', () => {
        try {
          const pretty = JSON.stringify(JSON.parse(body), null, 2) + '\n';
          fs.writeFile(configFilePath, pretty, 'utf8', (err) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ error: 'Failed to save config' }));
              return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: true }));
          });
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const relativePath = urlPath === '/' ? 'bubble-pop.html' : urlPath.replace(/^\/+/, '');
  const filePath = path.join(root, relativePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`Local server ready at http://127.0.0.1:${port}`);
});
