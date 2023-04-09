// This code imports the Express.js module and creates a new router object.
import express from "express";
import multer from "multer";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { GetDocumentsWithRoot, ZipDir, getFileMetadata, RenameFile, CreateDirectoryIfNotExists, SyncDBWithFilesystem, MoveFile } from "../database/filesdb.js";
import { GetBaseDir, GetUserByCreds, NewUser, GetCurrDir, UpdateRefreshToken } from "../database/usersdb.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import os from "os";
import { GetDocumentById, UpdateDocument, InsertDocument, RemoveDocument, QueryCollection, getStorageInfo } from "../database/dbops.js";
import jwt from "jsonwebtoken";
import { comparePasswords, isValidInput } from "../database/crypt.js";

let router = express.Router();

const storage = multer.diskStorage({
  preservePath: true,
  destination: async (req, file, callback) => {
    var targetPath;
    // Get the current directory from collection
    const currDir = await GetCurrDir(req.decoded.userId);
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
  const token = req.cookies.accessToken;

  // If token is not present, return 401
  if (!token) {
    // Redirect user to login page
    const error = new Error("Unauthorized");
    error.status = 401;
    return next();
    // res.redirect("/login");
    // return res.sendStatus(401);
  }

  // If token is present, verify it
  // Change "secret" to process.env.JWT_SECRET
  jwt.verify(token, "accessSecret", (err, decoded) => {
    if (err) {
      // Redirect user to login page

      res.sendStatus(401);
    } else {
      req.decoded = decoded;
      next();
    }
  });
}

router.post('/token', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(401);

  const user = await QueryCollection({ refreshToken: refreshToken }, userCollection);

  if (!user) return res.sendStatus(403);

  jwt.verify(refreshToken, 'refreshSecret', (err, user) => {
    if (err) return res.sendStatus(403);

    const accessToken = generateAccessToken(user.userId);
    res.cookie('accessToken', accessToken, { httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: new Date(Date.now() + 15 * 60 * 1000) }); // 15 minutes
    res.json({ accessToken });
  });
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

router.get("/", authenticateToken, function (req, res) {
  console.log("GET main page");
  // Check auth status
  if (!req.decoded) {
    console.log("User not authenticated!");
    res.redirect("/login");
  } else {
    console.log("User authenticated! Serving index.html...");

    // Set headers to prevent caching
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.setHeader("Content-Type", "text/html");
    res.setHeader("status", "200");
    res.sendFile(join(__dirname, "views", "index.html"));
  }
});


// This code sets up a new route for a GET request to the '/login' path,
// and defines a callback function to handle the request.
// The callback function sets the 'Content-type' header of the response to 'text/html',
// and sends back the contents of a file named 'login.html' located in a 'public' folder.
router.get("/login", function (req, res) {
  res.setHeader("Content-type", "text/html");
  res.sendFile(join(__dirname, "views", "login.html"));
});

router.get("/logout", function (req, res) {
  const refreshToken = req.cookies.refreshToken;
  const accessToken = req.cookies.accessToken;
  // Expire tokens
  res.cookie('accessToken', accessToken, { httpOnly: true,
    secure: true,
    sameSite: 'strict',
    expires: new Date(0) });
  res.cookie('refreshToken', refreshToken, { httpOnly: true,
    secure: true,
    sameSite: 'strict',
    expires: new Date(0) });
  res.redirect("/login");
});

router.get("/signup", function (req, res) {
  res.setHeader("Content-type", "text/html");
  res.sendFile(join(__dirname, "views", "signup.html"));
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
    const accessToken = generateAccessToken(user[0]._id);
    const refreshToken = generateRefreshToken(user[0]._id);

    // Store access and refresh tokens in httpOnly cookies
    res.cookie('accessToken', accessToken, { httpOnly: true,
      secure: true,
      sameSite: 'strict',
    expires: new Date(Date.now() + 15 * 60 * 1000) }); // 15 minutes

    res.cookie('refreshToken', refreshToken, { httpOnly: true,
      secure: true,
      sameSite: 'strict',
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }); // 30 days

    // Store refresh token in database
    await UpdateRefreshToken(user[0]._id, refreshToken);
    console.log("User authenticated, redirect to main page");
    res.redirect("/");
    // res.status(200).json({ message: "Logged in successfully" });
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


    // Create new user
    const result = await NewUser(username, password, basedir);
    if (!result) {
      console.log("Error creating user");
      return res.status(500).json({ message: 'Error creating User' });
    } else {
      // Create the user's base directory
      await CreateDirectoryIfNotExists(basedir);
      return res.status(201).json({ message: 'User created' });
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Requests
router.get("/metadata", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  const userId = decoded.userId;
  const path = req.query.path;
  GetDocumentsWithRoot(path, userId).then((data) => {
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
      res.send({baseDir: data});
    });
  }
});

router.get("/currdir", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  if (!decoded) {
    console.log("User not authenticated!");
    return res.sendStatus(401);
  }

  try {
    // Check if currDir is set
    GetCurrDir(decoded.userId).then((data) => {
      if (data) {
        res.status(200).send({ currDir: data });
      } else {
        res.status(404).send({ error: "Current directory not found" });
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Error getting current directory" });
  }
});

router.post("/currdir", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  if (!decoded) {
    console.log("User not authenticated!");
    return res.sendStatus(401);
  }
  const currDir = req.body.currDir;
  // Update the user's currDir field
  try {
    GetDocumentById(decoded.userId, "users").then((data) => {
      if (data && data.length > 0) {
        const user = data[0];
        UpdateDocument(user, { ["userDefaults.currDir"]: currDir }, "users");
      } else {
        console.log("User not found");
      }
    });
    res.status(200).send({ message: "Current directory updated to " + currDir });
  } catch (err) {
    console.log(err);
    console.log("Error updating current directory");
    res.status(500).send({ error: "Error updating current directory" });
  }
});

router.post("/download", authenticateToken, (req, res) => {
  const fileId = req.body.fileId;
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

router.post("/file-rename", authenticateToken, (req, res) => {
  const fileId = req.body.fileId;
  const newName = req.body.newName;
  GetDocumentById(fileId, "files").then((file) => {
    // Rename file here
    RenameFile(file[0], newName).then(() => {
      res.status(200).send(file[0].fileName + file[0].fileExt + " renamed to " + newName);
    });
  });
});

router.post("/file-move", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  const userId = decoded.userId;
  const fileId = req.body.fileId;
  const newPath = req.body.newPath;
  GetDocumentById(fileId, "files").then((file) => {
    // Move file here
    try {
      MoveFile(file[0], newPath).then(() => {
        res.status(200).send(file[0].fileName + file[0].fileExt + " moved to " + newPath);
      });
    } catch (err) {
      console.log(err);
      res.status(500).send({message: "Error moving file"});
    }
  });
})

router.get("/file-info", authenticateToken, (req, res) => {
  const fileId = req.query.fileId;
  GetDocumentById(fileId, "files").then((file) => {
    res.status(200).send(file[0]);
  });
});

router.post("/isfavourited", authenticateToken, (req, res) => {
  const fileId = req.body.fileId;
  GetDocumentById(fileId, "files").then((file) => {
    res.send({"isFavourited": file[0].isFavourited});
  });
});

router.post("/toggle-favourite", authenticateToken, (req, res) => {
  const fileId = req.body.fileId;
  GetDocumentById(fileId, "files").then((file) => {
    // Toggle favourite here
    UpdateDocument(file[0], {"isFavourited": !file[0].isFavourited}, "files").then(() => {
      GetDocumentById(fileId, "files").then((file) => {
        res.send({"isFavourited": file[0].isFavourited});
      });
    });
  });
});

router.post('/update-preference', authenticateToken, (req, res) => {
  const decoded = req.decoded;
  const preference = req.body.prefKey;
  const newValue = req.body.newValue;

  GetDocumentById(decoded.userId, 'users').then((user) => {
    const prefKey = 'userDefaults.preferences.' + preference + '.prefValue';

    UpdateDocument(user[0], { [prefKey]: newValue }, 'users').then(() => {
      res.send({ [preference]: newValue });
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

router.get("/storage-info", authenticateToken, (req, res) => {
  var decoded = req.decoded;
  if (!decoded) {
    console.log("User not authenticated!");
    res.sendStatus(401);
  } else {
    getStorageInfo().then((data) => {
      res.send(JSON.stringify(data));
    });
  }
});

const createFolderIfNotExists = async (folderPath) => {
  try {
    await fs.promises.access(folderPath);
    return null;
  } catch {
    console.log("Creating folder: " + folderPath);
    return await fs.promises.mkdir(folderPath, { recursive: true });
  }
};

const moveFile = async (src, dest) => {
  await fs.promises.rename(src, dest);
};

const saveMetadata = async (filePath, userId) => {
  const metadata = await getFileMetadata(filePath);
  metadata.fileOwner = userId;
  await InsertDocument(metadata, "files");
};

const allNull = (arr) => arr.every(value => value === null);

router.post("/upload", authenticateToken, upload.array("files"), async (req, res) => {
  try {
    const userId = req.decoded.userId;
    const currDir = await GetCurrDir(userId);
    const filePaths = JSON.parse(req.body.filePaths);
    const files = req.files;
    // let targetPath;
    if (allNull(filePaths)) {
      const metadataPromises = files.map(file => saveMetadata(file.path, userId));
      await Promise.all(metadataPromises);
    } else {
      const moveAndSavePromises = files.map(async (file, index) => {
        const srcPath = join(file.destination, file.filename);
        let targetPath;

        if (filePaths[index] !== null) {
          targetPath = join(currDir, filePaths[index]);
        } else {
          targetPath = join(currDir, file.filename);
        }
          await createFolderIfNotExists(dirname(targetPath));
          await moveFile(srcPath, targetPath);
          await saveMetadata(targetPath, userId);
      });

      await Promise.all(moveAndSavePromises);
      await SyncDBWithFilesystem(currDir, userId);
    }

    res.status(201).send("Files uploaded successfully");
  } catch (error) {
    console.error('Error during file upload:', error);
    res.status(500).send("An error occurred during file upload. Please try again.");
  }
});

router.get('/last-sync', authenticateToken, (req, res) => {
  const decoded = req.decoded;
  if (!decoded) {
    console.log("User not authenticated!");
    res.sendStatus(401);
  } else {
    GetDocumentById(decoded.userId, "users").then((user) => {
      res.status(200).send(user[0].userDefaults.lastSync);
    });
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
      SyncDBWithFilesystem(baseDir, decoded.userId).then(() => {
        // Update last sync time in user document
        GetDocumentById(decoded.userId, "users").then((user) => {
          UpdateDocument(user[0], { ["userDefaults.lastSync"]: new Date() }, "users");
          res.status(201).send("Synced filesystem with database");
        });
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

// Catch errors and serve the appropriate error page
router.get((req, res, next) => {
  const status = err.status || 500;
  res.status(status);
  console.log(status);
  res.sendFile(join(__dirname, "views", `${status}.html`));
});

// Catch all other routes and return 404
router.get("*", (req, res, next) => {
  console.log("404");
  res.sendFile(join(__dirname, "views", "404.html"));
});


// This code exports the router object to make it available for other parts of the application.
export default router;
