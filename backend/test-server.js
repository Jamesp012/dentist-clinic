const http = require('http');

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/auth/login') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          token: 'test-token-12345',
          user: {
            id: 1,
            username: 'doctor',
            role: 'doctor',
            fullName: 'Dr. Joseph Maaño',
            email: 'doctor@dental.com'
          }
        }));
      } catch (e) {
        res.writeHead(400, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({error: 'Invalid JSON'}));
      }
    });
  } else if (req.url === '/api/health') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({status: 'OK'}));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(5000, '127.0.0.1', () => {
  console.log('Test server running on http://127.0.0.1:5000');
});
