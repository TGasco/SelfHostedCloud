var http = require('http');
var express = require('express');
const fs = require('fs');

// Initialise middleware
let app = express();
let router = require('./router.js');
let db = require('./database/filesdb.js');
var multer = require('multer');
const path = require('path');
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

function getFileMetadata(filePath, callback) {
  // First we need to check whether the path is valid!
  if (pathExists(filePath)) {
    console.log("Path does not exist at " + filePath + "!");
    return null;
  }
  // Initialise variables
  var fileName;
  var fileExt;
  var fileSize;
  var lastModified;
  var dirPath;
  var lastViewed;
  var isFavourited = false;
  var isDirectory;
  var uploadDate;

  fileName = path.basename(filePath, path.extname(filePath));
  dirPath = path.dirname(filePath);
  fileExt = path.extname(filePath);
  isDirectory = isDir(filePath);

   const metadata = fs.stat(filePath, function(err, stats){
    //Checking for errors
    if(err){
        console.log(err)
    }
    else {
      //Logging the stats Object
      fileSize = stats.size;
      lastModified = stats.mtime;
      lastViewed = stats.atime;
      uploadDate = stats.birthtime;

      metadata = {
        "fileName": fileName,
        "fileExt": fileExt,
        "dirPath": dirPath,
        "fileSize": fileSize,
        "lastModified": lastModified,
        "lastViewed": lastViewed,
        "uploadDate": uploadDate,
        "isFavourited": isFavourited,
        "isDirectory": isDirectory,
      }
      // console.log(metadata)
      return metadata;
    }
  });

}

function pathExists(filePath) {
  fs.access(filePath, fs.F_OK, function(err) {
    if (err) {
      console.error(err)
      return false
    } else {
      console.log('Valid path')
      return true
    }
  })
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

var file = getFileMetadata(filePath);
console.log(file)
// db(file)
// get_req('login.html')

