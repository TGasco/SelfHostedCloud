// This code imports the Express.js module and creates a new router object.
import express from "express";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { GetDocumentsWithRoot } from "../database/filesdb.js";
import { GetBaseDir, GetUserId } from "../database/usersdb.js";
import os from "os";
import { GetDocumentById, UpdateDocument } from "../database/dbops.js";
let router = express.Router();

const __dirname = dirname(fileURLToPath(import.meta.url));

const fileCollection = "myDrive";
const userCollection = "userCredentials";

router.get("/myDrive", function (req, res) {
  res.setHeader("Content-type", "text/html");
  res.sendFile(__dirname + "/" + "public/index.html");
});
// This code sets up a new route for a GET request to the '/login' path,
// and defines a callback function to handle the request.
// The callback function sets the 'Content-type' header of the response to 'text/html',
// and sends back the contents of a file named 'login.html' located in a 'public' folder.
router.get("/login", function (req, res) {
  res.setHeader("Content-type", "text/html");
  res.sendFile(__dirname + "/" + "public/login.html");
});

// This code sets up a new route for a POST request to the '/login' path,
// and defines a callback function to handle the request.
// The callback function sends a response with the message 'Login successful'.
router.post("/login", function (req, res) {
  res.send("Login successful");
});

// GET Requests
router.get("/metadata", (req, res) => {
  const currDir = req.query.relpath;
  console.log(currDir);
  GetBaseDir().then((baseDir) => {
    GetDocumentsWithRoot(join(baseDir, currDir)).then((data) => {
      res.send(data);
    });
  });
});

router.get("/basedir", (req, res) => {
  GetBaseDir().then((data) => {
    res.send(data);
  });
});

router.get("/fileCollection", (req, res) => {
  res.send(fileCollection);
});

router.get("/userCollection", (req, res) => {
  res.send(userCollection);
});

router.get("/download" , (req, res) => {
  const fileId = req.query.fileId;
  GetDocumentById(fileId, "myDrive").then((file) => {
    const path = join(file[0].dirPath, file[0].fileName + file[0].fileExt);
    res.download(path, (err) => {
      if (err) {
        res.status(404).send("File not found!");
      }
    });
  });
});

router.get("/file-rename" , (req, res) => {
  const fileId = req.query.fileId;
  GetDocumentById(fileId, "myDrive").then((file) => {
    // Rename file here
    res.send(file[0].fileName + file[0].fileExt + " renamed");
  });
});

router.get("/file-info" , (req, res) => {
  const fileId = req.query.fileId;
  GetDocumentById(fileId, "myDrive").then((file) => {
    res.send(file[0]);
  });
});

router.get("/isfavourited" , (req, res) => {
  const fileId = req.query.fileId;
  GetDocumentById(fileId, "myDrive").then((file) => {
    res.send({"isFavourited": file[0].isFavourited});
  });
});

router.get("/togglefavourite" , (req, res) => {
  const fileId = req.query.fileId;
  GetDocumentById(fileId, "myDrive").then((file) => {
    // Toggle favourite here
    UpdateDocument(file[0], {"isFavourited": !file[0].isFavourited}, "myDrive").then(() => {
      GetDocumentById(fileId, "myDrive").then((file) => {
        res.send({"isFavourited": file[0].isFavourited});
      });
    });
  });
});

router.get("/file-delete" , (req, res) => {
  const fileId = req.query.fileId;
  GetDocumentById(fileId, "myDrive").then((file) => {
    // Delete file here
    res.send(file[0].fileName + file[0].fileExt + " deleted");
  });
});

// This code exports the router object to make it available for other parts of the application.
export default router;
