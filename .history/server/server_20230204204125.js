import http from 'http';
import express from 'express';
import { stat as _stat, access, F_OK, lstatSync } from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
// Initialise middleware
let app = express();
import router from './router.js';
import { InsertDocument, GetAllDocuments, GetDocumentsWithRoot, walkDir, InsertFilesystem, QueryCollection } from '../database/filesdb.js';
import multer from 'multer';
import { basename, extname, dirname, join } from 'path';

// Define __dirname (not available by default in ES6 modules)
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static(join(__dirname, 'public')));
app.use(router);

// Define Constants
let PORT = 8081; // Port to listen on

var server = app.listen(PORT, function() {
  var host = server.address().address
  host = (host == '::')? 'localhost':host;
  var port = server.address().port
  console.log(host)
  console.log(port)
  console.log("Server listening at http://%s:%s", host, port)
})

var filePath = "/Users/thomasgascoyne/SelfHostedCloudDrive/RandoFolder/WorldHello.txt"

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

  fileName = basename(filePath, extname(filePath));
  dirPath = dirname(filePath);
  fileExt = extname(filePath);
  isDirectory = isDir(filePath);
  return new Promise(function(resolve, reject) {
    _stat(filePath, function(err, stats) {
      //Checking for errors
      if(err){
          reject(err);
      }
      else {
        //Logging the stats Object
        fileSize = stats.size;
        lastModified = stats.mtime;
        lastViewed = stats.atime;
        uploadDate = stats.birthtime;

        resolve({
          "fileName": fileName,
          "fileExt": fileExt,
          "dirPath": dirPath,
          "fileSize": fileSize,
          "lastModified": lastModified,
          "lastViewed": lastViewed,
          "uploadDate": uploadDate,
          "isFavourited": isFavourited,
          "isDirectory": isDirectory,
        });
      }
    });
  })
}

function pathExists(filePath) {
  access(filePath, F_OK, function(err) {
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
      var stat = lstatSync(path);
      return stat.isDirectory();
  } catch (e) {
      // lstatSync throws an error if path doesn't exist
      console.log("Path does not exist!")
      return false;
  }
}

// getFileMetadata(filePath).then(metadata => {InsertDocument(metadata)});
// GetAllDocuments().then(data => {console.log(data)});
var dir = join("/Users", "thomasgascoyne", "SelfHostedCloudDrive");
// (async () => {
//   try {
//     const files = await walkDir(dir);
//     console.log(files);
//     // for (let i = 0; i < files.length; i++) {
//     // }
//   } catch (error) {
//     console.error(error);
//   }
// })();
// InsertFilesystem(dir);

// GetDocumentsWithRoot(dir).then(data => {console.log(data)});
// GetAllDocuments().then(data => {console.log(data)});
QueryCollection({"dirPath" : dir, "fileName" : "HelloWorld", "fileExt" : ".txt"}).then(data => {console.log(data)});
