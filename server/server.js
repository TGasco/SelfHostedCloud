import http from "http";
import express from "express";
import os from "os";
import { stat as _stat, access, F_OK, lstatSync } from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import router from "./router.js";
import {
  GetDocumentsWithRoot,
  InsertFilesystem,
  RenameFile,
} from "../database/filesdb.js";
import {
  DocumentExists,
  GetAllDocuments,
  GetDocumentById,
} from "../database/dbops.js";
import multer from "multer";
import { basename, extname, dirname, join } from "path";
import { GetBaseDir, NewUser } from "../database/usersdb.js";

// Initialise middleware
let app = express();

// Define __dirname (not available by default in ES6 modules)
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static(join(__dirname, "public")));
app.use(router);

// Define Constants
let PORT = 8081; // Port to listen on

var server = app.listen(PORT, function () {
  var host = server.address().address;
  host = host == "::" ? "localhost" : host;
  var port = server.address().port;
  console.log(host);
  console.log(port);
  console.log("Server listening at http://%s:%s", host, port);
});

// InsertFilesystem(await GetBaseDir());

// RenameFile("RandoFolder2", "ItWorks2", await GetBaseDir());

GetAllDocuments("myDrive").then(data => console.log(data));

// const sampledoc = GetDocumentById("63dedf550473a1236832a601", "myDrive").then(
//   (data) => DocumentExists(data[0], "myDrive").then((data) => console.log(data))
// );
