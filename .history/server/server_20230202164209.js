var http = require('http');
var express = require('express');
const fs = require('fs');

// Initialise middleware
let app = express();
let router = require('./router.js');
var multer = require('multer');
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
  host = (host == '::')? 'localhost':host;
  var port = server.address().port
  console.log(host)
  console.log(port)
  console.log("Server listening at http://%s:%s", host, port)
})

var filePath =
//stat methods takes path and a callback function as input
fs.stat("./info.txt", function(err, stats){
  //Checking for errors
  if(err){
      console.log(err)
  }
  else{
  //Logging the stats Object
  console.log(stats)
  }
});

// get_req('login.html')
