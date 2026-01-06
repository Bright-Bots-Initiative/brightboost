
const express = require('express');
const compression = require('compression');
const http = require('http');

const app = express();
app.use(compression());

app.get('/', (req, res) => {
  const largeData = 'a'.repeat(2000);
  res.send(largeData);
});

const server = app.listen(0, () => {
  const address = server.address();
  const port = address.port;

  const options = {
    hostname: 'localhost',
    port: port,
    path: '/',
    method: 'GET',
    headers: {
      'Accept-Encoding': 'gzip'
    }
  };

  const req = http.request(options, (res) => {
    const encoding = res.headers['content-encoding'];
    console.log(`Status: ${res.statusCode}`);
    console.log(`Content-Encoding: ${encoding}`);

    if (encoding === 'gzip') {
      console.log('✅ Verification Successful: Response was gzipped.');
      server.close();
      process.exit(0);
    } else {
      console.error('❌ Verification Failed: Response was NOT gzipped.');
      server.close();
      process.exit(1);
    }
  });

  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
    server.close();
    process.exit(1);
  });

  req.end();
});
