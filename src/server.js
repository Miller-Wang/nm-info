const fs = require('fs');
const http = require('http');
const path = require('path');

function start(modules, port = 8080) {
  const template = fs.readFileSync(path.resolve(__dirname, './template.html'), {encoding: 'utf-8'});
  
  const data = template.replace('<!-- insert-data -->', `<script> 
  var modules = ${JSON.stringify(modules)};
  </script>`)

  const server = http.createServer((req, res) => {
    if (req.url.endsWith('favicon.ico')) {
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(data);
  });

  let started;
  function listen() {
    server.listen(port, () => {
      if (started) return;
      console.log(`Address: http://localhost:${port}`);
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
