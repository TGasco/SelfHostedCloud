import express from "express";
import https from "https";
import fs from "fs";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import bodyParser from "body-parser";
import compression from "compression";
import router from "./router.js";
import { updateAllCollections } from "../database/dbops.js";
import { dirname, join } from "path";
import { setup } from "./setup.js";
import cookieParser from "cookie-parser";
import serveFavicon from "serve-favicon";

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

app.use(compression());

// CORS middleware to allow cross-origin requests
app.use(cors({
  origin: ["https://localhost:8081"],
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Helmet middleware to set CSP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "blob:",], // Allow content from the same origin
        scriptSrc: [
          "'self'",
          "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.5.141/build/", // Allow access to pdfjs library
          "https://cdn.jsdelivr.net/npm/prismjs@1.27.0/"
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net/npm/prismjs@1.27.0/"],
        imgSrc: ["'self'", "data:", "blob:"], // Allow images from the same origin and data URIs
        fontSrc: ["'self'"],
        workerSrc: [
          "'self'",
          "blob:",
          "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.5.141/build/", // Allow access to pdfjs library
          "https://cdn.jsdelivr.net/npm/prismjs@1.27.0/"
        ],
      },
    },
  })
);





const publicPath = join(__dirname, "public");

app.use(serveFavicon(join(publicPath, "favicon.ico")));

app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  next();
});

app.use(express.static(publicPath));

// Use the router middleware for all requests
app.use(router);

// Define Constants
let PORT = 8081; // Port to listen on

setup().then(() => {
  // Start server
  updateAllCollections();

  // Create an HTTPS server for localhost
  const httpsServer = https.createServer(sslOptions, app);
  httpsServer.listen(PORT, function () {
    var host = httpsServer.address().address;
    host = host == '::' ? 'localhost' : host;
    var port = httpsServer.address().port;
    console.log('HTTPS server listening at https://%s:%s', host, port);
  });
});
