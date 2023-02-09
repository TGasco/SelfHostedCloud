var http = require('http');
let PORT = 8080;
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World');
}).listen(PORT);

console.log('Server running at http://127.0.0.1:8080/');
