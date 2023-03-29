import express from "express";
import https from "https";
import fs from "fs";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import router from "./router.js";
import { dirname, join } from "path";
import { InsertFilesystem } from "../database/filesdb.js";
import { GetBaseDir, NewUser } from "../database/usersdb.js";
import { GetAllDocuments } from "../database/dbops.js";

// Initialise middleware
let app = express();


// Define __dirname (not available by default in ES6 modules)
const __dirname = dirname(fileURLToPath(import.meta.url));

const sslOptions = {
  key: fs.readFileSync(join(__dirname, "server.key")),
  cert: fs.readFileSync(join(__dirname, "server.cert")),
}

app.use(express.static(join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(router);

// Define Constants
let PORT = 8081; // Port to listen on

const server = https.createServer(sslOptions, app);

server.listen(PORT, function () {
  var host = server.address().address;
  host = host == "::" ? "localhost" : host;
  var port = server.address().port;
  console.log(host);
  console.log(port);
  console.log("Server listening at http://%s:%s", host, port);
});

// InsertFilesystem(await GetBaseDir());


// GetAllDocuments("myDrive").then(data => console.log(data));
