import http from 'http';
import express from 'express';
import { stat as _stat, access, F_OK, lstatSync } from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
// Initialise middleware
let app = express();
import router from './router.js';
import { InsertDocument, GetAllDocuments, GetDocumentsWithRoot, walkDir, InsertFilesystem, QueryCollection, CountDocuments } from '../database/filesdb.js';
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

var dir = join("/Users", "thomasgascoyne", "SelfHostedCloudDrive");

GetDocumentsWithRoot(dir).then(data => {console.log(data)});
