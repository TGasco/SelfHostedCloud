// This code imports the Express.js module and creates a new router object.
import express from "express";
import multer from "multer";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { Extract } from "unzipper";
import { GetDocumentsWithRoot, ZipDir, getFileMetadata, RenameFile } from "../database/filesdb.js";
import { GetBaseDir, GetUserByCreds } from "../database/usersdb.js";
import os from "os";
import { GetDocumentById, UpdateDocument, InsertDocument, RemoveDocument, QueryCollection } from "../database/dbops.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { comparePasswords } from "../database/crypt.js";

let router = express.Router();

var currDir = await GetBaseDir();
const storage = multer.diskStorage({
  destination: async (req, file, callback) => {
      callback(null, currDir);
  },
  filename: (req, file, callback) => {
    callback(null, file.originalname);
  }
})

let upload = multer({ storage: storage});

const __dirname = dirname(fileURLToPath(import.meta.url));

const fileCollection = "myDrive";
const userCollection = "userCredentials";


router.get("/myDrive", function (req, res) {
  const file = req.query.file;
  console.log(file);
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
router.post("/login", async (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;
    const user = await GetUserByCreds(username);
    console.log(password);
    // If user not found, return error
    if (!user[0]) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare password hashes
    const isMatch = await comparePasswords(password, user[0].userPass);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    console.log("Passwords match, authenticate user");

    // Generate JWT token
    const token = jwt.sign({ userId: user[0]._id }, 'secret', { expiresIn: '1h' });

    res.status(200).json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Requests
router.get("/metadata", (req, res) => {
  const path = req.query.path;
  GetDocumentsWithRoot(path).then((data) => {
    res.send(data);
  });
});

router.get("/get-favourites", (req, res) => {
  const query = { isFavourited: true };
  QueryCollection(query, fileCollection).then((data) => {
    res.send(data);
  });
});

router.get("/basedir", (req, res) => {
  GetBaseDir().then((data) => {
    res.send(data);
  });
});

router.get("/get-currdir", (req, res) => {
    res.send(currDir);
});

router.post("/currdir", (req, res) => {
  currDir = req.body.currDir;
  res.send(req.body);
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
    if (file[0].isDirectory) {
      ZipDir(path, function(err) {
        console.log("Downloading directory!");
        if (err) {
          res.status(500).send("Error zipping directory");
        } else {
          res.download(path + ".zip", (err) => {
            if (err) {
              res.status(500).send("Error sending files to client");
            } else {
              // Delete zip file and extracted contents
              fs.unlink(path + ".zip", (err) => {
                if (err) {
                  console.log("Error deleting zip file");
                }
              });
            }
          });
        }
      });
    } else {
      res.download(path, (err) => {
        if (err) {
          res.status(404).send("File not found!");
        }
      });
    }
  });
});

router.get("/file-rename" , (req, res) => {
  const fileId = req.query.fileId;
  const newName = req.query.newName;
  GetDocumentById(fileId, "myDrive").then((file) => {
    // Rename file here
    RenameFile(file[0], newName).then(() => {
      res.send(file[0].fileName + file[0].fileExt + " renamed to " + newName);
    });
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
    RemoveDocument(file[0], "myDrive");
    fs.rmSync(join(file[0].dirPath, file[0].fileName + file[0].fileExt));
    res.send(file[0].fileName + file[0].fileExt + " deleted");
  });
});

// POST Requests
router.post("/upload", upload.single("file"), (req, res) => {
  const file = req.file;
  getFileMetadata(file.path).then((metadata) => {
    InsertDocument(metadata, "myDrive").then(() => {
      res.send("File uploaded successfully");
    });
  });
});

// This code exports the router object to make it available for other parts of the application.
export default router;
