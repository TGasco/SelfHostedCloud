var http = require('http');
var express = require('express');

// Initialise middleware
let app = express();
let router = require('./router.js');
app.use(express.static('public'));
app.use(router)


// Define Constants
let PORT = 8081; // Port to listen on

// function get_req(route) {
//   return app.get('/' + route, function(req, res) {
//     res.send('Testing Cloud App Alpha 0.0.1');
//   })
// }


var server = app.listen(PORT, function() {
  var host = server.address().address
  var port = server.address().port
  console.log(host)
  console.log(port)
  console.log("Server listening at http://%s:%s", host, port)
})

// get_req('login.html')
