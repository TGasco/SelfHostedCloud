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

var filePath = "/Users/thomasgascoyne/SelfHostedCloudDrive/HelloWorld.txt"
// var filePath = "/Users/thomasgascoyne/SelfHostedCloudDrive"
//stat methods takes path and a callback function as input
// fs.stat(filePath, function(err, stats){
//   //Checking for errors
//   if(err){
//       console.log(err)
//   }
//   else{
//   //Logging the stats Object
//   console.log(stats)
//   }
// });

function getFileMetadata(filePath, callback) {
  var fileName;
  var fileExt;
  var fileSize;
  var lastModified;
  var filePath;
  var lastViewed;
  var isFavourited;
  var isDirectory;
  var uploadDate;

  isDirectory = isDir(filePath);

}

function isDir(path) {
  try {
      var stat = fs.lstatSync(path);
      return stat.isDirectory();
  } catch (e) {
      // lstatSync throws an error if path doesn't exist
      console.log("Path does not exist!")
      return false;
  }
}

dir = isDir(filePath);
if (dir) {
  console.log("Path points to a directory");
} else {
  console.log("Path points to a file")
}

// get_req('login.html')
