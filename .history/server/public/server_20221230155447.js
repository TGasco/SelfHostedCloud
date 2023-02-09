var http = require('http');
var express = require('express');

var app = express();
let PORT = 8081;

app.get('/', function(req, res) {
  res.send('Testing Cloud App Alpha 0.0.1');
})

var server = app.listen(PORT, function() {
  var host = server.address().address
  var port = server.address().port

  console.log("Server listening at http://%s:%s", host, port)
})
