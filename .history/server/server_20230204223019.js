import http from 'http';
import express from 'express';
import os from 'os';
import { stat as _stat, access, F_OK, lstatSync } from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import router from './router.js';
import { InsertDocument, GetAllDocuments, GetDocumentsWithRoot, walkDir, InsertFilesystem, QueryCollection, CountDocuments } from '../database/filesdb.js';
import multer from 'multer';
import { basename, extname, dirname, join } from 'path';

// Initialise middleware
let app = express();

// Define __dirname (not available by default in ES6 modules)
const __dirname = dirname(fileURLToPath(import.meta.url));
const homedir = os.homedir();

const baseDir = join(homedir, "SelfHostedCloudDrive");

app.use(express.static(join(__dirname, 'public')));
app.use(router);

// GET Requests
app.get('/metadata', (req, res) => {
  GetDocumentsWithRoot(baseDir).then(data => {res.send(data)});
})

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

// InsertFilesystem(baseDir);
