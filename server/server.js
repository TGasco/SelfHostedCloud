import express from "express";
import https from "https";
import fs from "fs";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import bodyParser from "body-parser";
import router from "./router.js";
import { updateAllCollections } from "../database/dbops.js";
import { dirname, join } from "path";
import { setup } from "./setup.js";
import cookieParser from "cookie-parser";

// Initialise middleware
let app = express();

// Define __dirname (not available by default in ES6 modules)
const __dirname = dirname(fileURLToPath(import.meta.url));

const sslOptions = {
  key: fs.readFileSync(join(__dirname, "server.key")),
  cert: fs.readFileSync(join(__dirname, "server.cert")),
}


// Body parser middleware to parse request body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cookieParser());

// CORS middleware to allow cross-origin requests
app.use(cors({
  origin: "https://localhost:8081",
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Helmet middleware to set CSP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"], // Allow content from the same origin
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'], // Allow images from the same origin and data URIs
        fontSrc: ["'self'"],
      },
    },
  })
  );

app.use(express.static(join(__dirname, "public")));

// Use the router middleware for all requests
app.use(router);

// Define Constants
let PORT = 8081; // Port to listen on


setup().then(() => {
  // Start server
  updateAllCollections();
  // Check if server is already running on port, if so, restart
  const server = https.createServer(sslOptions, app);
  server.listen(PORT, function () {
    var host = server.address().address;
    host = host == "::" ? "localhost" : host;
    var port = server.address().port;
    console.log("Server listening at https://%s:%s", host, port);
  });
});
