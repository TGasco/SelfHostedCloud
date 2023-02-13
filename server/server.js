import express from "express";
import { stat as _stat } from "fs";
import { fileURLToPath } from "url";
import router from "./router.js";
import { dirname, join } from "path";

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


// GetAllDocuments("myDrive").then(data => console.log(data));
