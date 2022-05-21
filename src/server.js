const fs = require('fs').promises;
const http = require('http');
const path = require('path');
const url = require('url');
const mime = require('mime');
const { createReadStream, readFileSync } = require('fs');
const ejs = require('ejs');

function sendFile(filePath, req, res) {
  res.setHeader('Content-Type', mime.getType(filePath) + ';charset=utf-8');
  createReadStream(filePath).pipe(res);
}

function start(datas, port = 8080) {
  const { modules, totalSize, totalPackages } = datas;
  const template = readFileSync(path.resolve(__dirname, './template.html'), {
    encoding: 'utf-8',
  });

  const code = `window.datas = ${JSON.stringify(datas)};`;
  const data = template.replace('// <!-- insert-data -->', code);

  const server = http.createServer(async (req, res) => {
    if (req.url.endsWith('favicon.ico')) {
      res.end();
      return;
    }

    const { pathname } = url.parse(req.url);
    // console.log(req.url);
    if (pathname === '/') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(data);
    } else {
      // 找文件
      const filePath = path.join(process.cwd(), 'node_modules', pathname);
      try {
        let stateObj = await fs.stat(filePath);
        if (stateObj.isFile()) {
          sendFile(filePath, req, res);
        } else {
          let dirs = await fs.readdir(filePath);
          dirs = dirs.map((dir) => ({ dir, href: path.join(pathname, dir) }));
          const html = await ejs.renderFile(
            path.resolve(__dirname, 'ejs.html'),
            { dirs },
          );
          res.end(html);
        }
      } catch (error) {
        // console.log('------error-------', error);
      }
    }
  });

  let started;
  function listen() {
    server.listen(port, () => {
      if (started) return;
      console.log(`Please Open: http://localhost:${port}`);
      started = true;
    });
  }

  listen();

  server.on('error', () => {
    server.close();
    port++;
    listen();
  });
}

module.exports = start;
