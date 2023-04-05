// This code imports the Express.js module and creates a new router object.
import express from "express";
import multer from "multer";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { Extract } from "unzipper";
import { GetDocumentsWithRoot, ZipDir, getFileMetadata, RenameFile, CreateDirectoryIfNotExists, InsertFilesystem, SyncDBWithFilesystem } from "../database/filesdb.js";
import { GetBaseDir, GetUserByCreds, NewUser } from "../database/usersdb.js";
import os from "os";
import { GetDocumentById, UpdateDocument, InsertDocument, RemoveDocument, QueryCollection, getTotalStorageUsed } from "../database/dbops.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { comparePasswords, isValidInput } from "../database/crypt.js";

let router = express.Router();

var currDir = "";

const storage = multer.diskStorage({
  preservePath: true,
  destination: (req, file, callback) => {
    var targetPath;
    const dirPath = dirname(file.originalname);
    if (dirPath == ".") {
      targetPath = currDir;
    } else {
      targetPath = join(currDir, dirPath);
    }
    callback(null, targetPath);
  },
  filename: (req, file, callback) => {
    const baseName = basename(file.originalname);
    callback(null, baseName);
  }
});

let upload = multer({ storage: storage });

const __dirname = dirname(fileURLToPath(import.meta.url));

const fileCollection = "files";
const userCollection = "users";

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];

    // If token is not present, return 401
    if (!token) return res.sendStatus(401);

    // If token is present, verify it
    // Change "secret" to process.env.JWT_SECRET
    jwt.verify(token, "secret", (err, decoded) => {
      if (err) {
        // Redirect user to login page

        res.sendStatus(401);
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    res.sendStatus(401);
  }
}

router.get("uid", authenticateToken, function (req, res) {
  // Check auth status
  if (!req.decoded) {
    console.log("User not authenticated!");
    res.sendStatus(401);
  } else {
    res.setHeader("Content-type", "application/json");
    res.setHeader("status", "200");
    res.send(JSON.stringify(req.decoded.userId));
  }
});

router.get("/username", authenticateToken, async function (req, res) {
  // Check auth status
  if (!req.decoded) {
    console.log("User not authenticated!");
    res.sendStatus(401);
  } else {
    const user = await GetDocumentById(req.decoded.userId, userCollection);
    res.setHeader("Content-type", "application/json");
    res.setHeader("status", "200");
    res.send(JSON.stringify(user[0].userName));
  }
})

router.get("/myDrive", authenticateToken, function (req, res) {
  // Check auth status
  if (!req.decoded) {
    console.log("User not authenticated!");
    res.sendStatus(401);
  } else {
    res.setHeader("Content-type", "text/html");
    res.setHeader("status", "200");
    res.sendFile(__dirname + "/" + "public/index.html");
  }
});

// This code sets up a new route for a GET request to the '/login' path,
// and defines a callback function to handle the request.
// The callback function sets the 'Content-type' header of the response to 'text/html',
// and sends back the contents of a file named 'login.html' located in a 'public' folder.
router.get("/login", function (req, res) {
  res.setHeader("Content-type", "text/html");
  res.sendFile(__dirname + "/" + "public/login.html");
});

router.get("/signup", function (req, res) {
  res.setHeader("Content-type", "text/html");
  res.sendFile(__dirname + "/" + "public/signup.html");
});

// This code sets up a new route for a POST request to the '/login' path,
// and defines a callback function to handle the request.
// The callback function sends a response with the message 'Login successful'.
router.post("/login", async (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;

    // Sanitize and validate user inputs
    if (!isValidInput(username, password)) {
      console.log("Invalid input");
      return res.status(400).json({ message: 'Invalid input' });
    }

    const user = await GetUserByCreds(username);
    // If user not found, return error
    if (!user[0]) {
      console.log("User not found");
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    console.log("User found, compare passwords");
    // Compare password hashes
    const passMatch = await comparePasswords(password, user[0].userPass);

    if (!passMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    console.log("Passwords match, authenticate user");

    // Generate JWT token
    const token = jwt.sign({ userId: user[0]._id }, 'secret', { expiresIn: '1h' });
    res.status(200).json({ token: token });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post("/signup", async (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;
    var basedir = join(req.body.basedir || os.homedir(), "MyCloudDrive", username);
    console.log(basedir);

    // Sanitize and validate user inputs
    if (!isValidInput(username, password)) {
      console.log("Invalid input");
      return res.status(400).json({ message: 'Invalid input' });
    }

    const user = await GetUserByCreds(username);
    // If user already exists, return error
    if (user[0]) {
      console.log("User already exists");
      return res.status(409).json({ message: 'User already exists' });
    }
    console.log("User does not exist, create new user");

    // Create the user's base directory
    await CreateDirectoryIfNotExists(basedir);

    // Create new user
    const result = await NewUser(username, password, basedir);
    return res.status(201).json({ message: 'User created' });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Requests
router.get("/metadata", authenticateToken, (req, res) => {
  const path = req.query.path;
  GetDocumentsWithRoot(path).then((data) => {
    res.send(data);
  });
});

router.get("/get-favourites", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  const query = { fileOwner: decoded.userId,
    isFavourited: true };
  QueryCollection(query, fileCollection).then((data) => {
    res.send(data);
  });
});

router.get("/get-preferences", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  GetDocumentById(decoded.userId, "users").then((data) => {
    if (data && data.length > 0 && data[0].userDefaults.preferences) {
      res.send(data[0].userDefaults.preferences); // Send only the userDefaults field
    } else {
      res.status(404).send({ error: "User defaults not found" });
    }
  });
});


router.get("/basedir", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  if (!decoded) {
    console.log("User not authenticated!");
    res.sendStatus(401);
  } else {
    GetBaseDir(decoded.userId).then((data) => {
      res.send(data);
    });
  }
});

router.get("/get-currdir", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  if (!decoded) {
    console.log("User not authenticated!");
    res.sendStatus(401);
  } else {
    // Check if currDir is set
    res.send(currDir);
  }
});

router.post("/currdir", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  if (!decoded) {
    console.log("User not authenticated!");
    return res.sendStatus(401);
  }
  currDir = req.body.currDir;
  res.send(req.body);
});

router.get("/fileCollection", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  if (!decoded) {
    console.log("User not authenticated!");
    res.sendStatus(401);
  }
  res.send(fileCollection);
});

router.get("/userCollection", authenticateToken, (req, res) => {
  res.send(userCollection);
});

router.get("/download", authenticateToken, (req, res) => {
  const fileId = req.query.fileId;
  GetDocumentById(fileId, "files").then((file) => {
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

router.get("/file-rename", authenticateToken, (req, res) => {
  const fileId = req.query.fileId;
  const newName = req.query.newName;
  GetDocumentById(fileId, "files").then((file) => {
    // Rename file here
    RenameFile(file[0], newName).then(() => {
      res.send(file[0].fileName + file[0].fileExt + " renamed to " + newName);
    });
  });
});

router.get("/file-info", authenticateToken, (req, res) => {
  const fileId = req.query.fileId;
  GetDocumentById(fileId, "files").then((file) => {
    res.send(file[0]);
  });
});

router.get("/isfavourited", authenticateToken, (req, res) => {
  const fileId = req.query.fileId;
  GetDocumentById(fileId, "files").then((file) => {
    res.send({"isFavourited": file[0].isFavourited});
  });
});

router.get("/togglefavourite", authenticateToken, (req, res) => {
  const fileId = req.query.fileId;
  GetDocumentById(fileId, "files").then((file) => {
    // Toggle favourite here
    UpdateDocument(file[0], {"isFavourited": !file[0].isFavourited}, "files").then(() => {
      GetDocumentById(fileId, "files").then((file) => {
        res.send({"isFavourited": file[0].isFavourited});
      });
    });
  });
});

router.get("/update-preferences", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  const preference = req.query.prefKey;
  console.log("Preferences: " + preference);
  GetDocumentById(decoded.userId, "users").then((user) => {
    const prefKey = "userDefaults.preferences." + preference + ".prefValue";
    UpdateDocument(user[0], {[prefKey]: !user[0].userDefaults.preferences[preference].prefValue}, "users").then(() => {
      res.send({[preference]: !user[0].userDefaults.preferences[preference].prefValue});
    });
  });
});

router.get("/file-delete", authenticateToken, (req, res) => {
  const fileId = req.query.fileId;
  GetDocumentById(fileId, "files").then((file) => {
    // Check if file is a directory
    if (file[0].isDirectory) {
      try {
        fs.rmSync(join(file[0].dirPath, file[0].fileName + file[0].fileExt), { recursive: true });
        // Get all files in directory
        GetDocumentsWithRoot(join(file[0].dirPath, file[0].fileName), true).then((files) => {
          files.forEach((file) => {
            RemoveDocument(file, "files");
          });
        });
        RemoveDocument(file[0], "files");
        res.send(file[0].fileName + file[0].fileExt + " deleted");
      } catch (err) {
        res.status(500).send("Error deleting directory");
      }
    } else {
      // Delete file here
      try {
        fs.rmSync(join(file[0].dirPath, file[0].fileName + file[0].fileExt));
        RemoveDocument(file[0], "files");
        res.send(file[0].fileName + file[0].fileExt + " deleted");
      } catch (err) {
        // RemoveDocument(file[0], "files");
        res.status(500).send("Error deleting file");
      }
    }
  });
});

router.get("/total-storage", authenticateToken, (req, res) => {
  var decoded = req.decoded;
  if (!decoded) {
    console.log("User not authenticated!");
    res.sendStatus(401);
  } else {
    getTotalStorageUsed("files").then((data) => {
      res.send(JSON.stringify(data));
    });
  }
});

router.post("/upload", authenticateToken, upload.array("files"), (req, res) => {
  // Manually process 'filePaths'
  const userId = req.decoded.userId;
  req.body.filePaths = JSON.parse(req.body.filePaths);
  const files = req.files;
  if (req.body.filePaths.length === 0) {
    const metadataPromises = files.map(file => getFileMetadata(file.path));
    console.log(metadataPromises);
    Promise.all(metadataPromises).then((metadataArray) => {
      const insertPromises = metadataArray.map(metadata => {
        metadata.fileOwner = userId;
        return InsertDocument(metadata, "files")
      });
      Promise.all(insertPromises).then(() => {
        res.status(201).send("Files uploaded successfully");
      });
    });
  } else {
    files.forEach((file, index) => {
      const srcPath = join(file.destination, file.filename);
      var targetDir;
      if (req.body.filePaths.hasOwnProperty(index)) {
        targetDir = join(currDir, dirname(req.body.filePaths[index]));
        const targetPath = join(targetDir, file.filename);

        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
          getFileMetadata(targetDir).then((metadata) => {
            metadata.fileOwner = userId;
            InsertDocument(metadata, "files");
          });
        }

        fs.renameSync(srcPath, targetPath);
        getFileMetadata(targetPath).then((metadata) => {
          metadata.fileOwner = userId;
          InsertDocument(metadata, "files");
        });
      }
    });
    res.status(201).send("Files uploaded successfully");
  }
});

router.get('/sync', authenticateToken, (req, res) => {
  // Sync filesystem with database
  var decoded = req.decoded;
  if (!decoded) {
    console.log("User not authenticated!");
    res.sendStatus(401);
  } else {
    GetBaseDir(decoded.userId).then((baseDir) => {
      // currDir = baseDir;
      SyncDBWithFilesystem(baseDir, decoded.userId).then(() => {
        res.status(201).send("Synced filesystem with database");
      });
    });
  }
});

router.post("/file-search", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  const userId = decoded.userId;
  if (!decoded) {
    console.log("User not authenticated!");
    res.sendStatus(401);
  }

  try {
    const searchTerm = req.body.searchTerm;
    const searchQuery = new RegExp(searchTerm, "i");
    const pipeline = [
      {
        $addFields: {
          searchTermIndex: {
            $regexFind: {
              input: "$fileName",
              regex: new RegExp(searchTerm, "i"),
            },
          },
        },
      },
      {
        $match: {
          "searchTermIndex.match": { $exists: true },
          fileName: { $regex: searchQuery },
          fileOwner: userId,
        },
      },
      { $sort: { "searchTermIndex.idx": 1, lastViewed: -1, isFavourite: -1 } },
      { $project: { searchTermIndex: 0 } },
    ];



    QueryCollection(null, "files", pipeline).then((files) => {
      res.json(files);
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});


// This code exports the router object to make it available for other parts of the application.
export default router;
