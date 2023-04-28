// This code imports the Express.js module and creates a new router object.
import express from "express";
import multer from "multer";
import mime from "mime";
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

const router = express.Router();

// Multer configuration: middleware handles file uploads
const storage = multer.diskStorage({
  preservePath: true,
  destination: async (req, file, callback) => {
    let targetPath;
    // Get the current directory from collection
    const currDir = await GetCurrDir(req.decoded.userId);
    const dirPath = dirname(file.originalname);
    targetPath = dirPath == "." ? currDir : join(currDir, dirPath);
    callback(null, targetPath);
  },
  filename: (req, file, callback) => {
    const baseName = basename(file.originalname);
    callback(null, baseName);
  }
});

const upload = multer({ storage });

const __dirname = dirname(fileURLToPath(import.meta.url));

const fileCollection = "files";
const userCollection = "users";

// Authentication middleware: checks if user is authenticated by verifying the access token to retrieve decoded userID
// Applied to all protected routes
function authenticateToken(req, res, next) {
  const token = req.cookies.accessToken;

  // If token is not present, return 401
  if (!token) {
    req.decoded = null;
    return next();
  }

  // If token is present, verify it
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // Redirect user to login page
      console.log("Token verification failed!");
      res.sendStatus(401);
    } else {
      req.decoded = decoded;
      next();
    }
  });
}

// POST request - Refreshes an expired access token using a valid refresh token
router.post('/token', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(401);

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    generateAccessToken(user.userId, process.env.ACCESS_TOKEN_SECRET).then(accessToken => {
      res.cookie('accessToken', accessToken, { httpOnly: true,
        secure: true,
        sameSite: 'strict',
        expires: new Date(Date.now() + 15 * 60 * 1000) }); // 15 minutes
      res.json({ accessToken });
    });
  });
});

// GET request - refreshes (a non-expired) access token
router.get("/token-refresh", authenticateToken, async (req, res) => {
  // Check auth status
  if (req.decoded) {
    const accessToken = await generateAccessToken(req.decoded.userId, process.env.ACCESS_TOKEN_SECRET);
    res.cookie('accessToken', accessToken, { httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: new Date(Date.now() + 15 * 60 * 1000) }); // 15 minutes
    res.sendStatus(200).json({ accessToken });
    return;
  }
  console.log("User not authenticated!");
  res.sendStatus(401);
});

// GET Request - returns the username for the current user
router.get("/username", authenticateToken, async function (req, res) {
  // Check auth status
  if (req.decoded) {
    const user = await GetDocumentById(req.decoded.userId, userCollection);
    res.setHeader("Content-type", "application/json");
    res.setHeader("status", "200");
    res.send(JSON.stringify(user[0].userName));
    return;
  }
  console.log("User not authenticated!");
  res.sendStatus(401);
})

// GET Request - serves the user's home page
router.get("/", authenticateToken, function (req, res) {
  console.log("GET main page");
  // Check auth status
  if (req.decoded) {
    console.log("User authenticated! Serving index.html...");

    res.setHeader("Content-Type", "text/html");
    res.setHeader("status", "200");
    res.sendFile(join(__dirname, "views", "index.html"));
    return;
  }
  console.log("User not authenticated!");
  res.redirect("/login");
});


// GET Request - serves the login page
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

// GET Request - serves the signup page
router.get("/signup", function (req, res) {
  res.setHeader("Content-type", "text/html");
  res.sendFile(join(__dirname, "views", "signup.html"));
});

// POST Request - handles user authentication on the login page
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

    // Generate JWT tokens
    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(user[0]._id, process.env.ACCESS_TOKEN_SECRET),
      generateRefreshToken(user[0]._id, process.env.REFRESH_TOKEN_SECRET)
    ]);

    // Set access and refresh tokens in httpOnly cookies
    res.cookie('accessToken', accessToken, { httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: new Date(Date.now() + 15 * 60 * 1000) });
    res.cookie('refreshToken', refreshToken, { httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) });

    console.log("User authenticated, redirect to main page");
    res.redirect("/");

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST request - handles user signup on the signup page
router.post("/signup", async (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;
    const basedir = join(req.body.basedir || os.homedir(), "MyCloudDrive", username);

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
    if (result) {
      // Create the user's base directory
      await CreateDirectoryIfNotExists(basedir);
      return res.status(201).json({ message: 'User created' });
    } else {
      console.log("Error creating user");
      return res.status(500).json({ message: 'Error creating User' });
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Request - Returns a list of documents at a given path
router.get("/metadata", authenticateToken, async (req, res) => {
  const decoded = req.decoded;
  const userId = decoded.userId;
  const path = req.query.path;

  if (!userId) {
    console.log("User not authenticated!");
    return res.sendStatus(401);
  }

  await GetDocumentsWithRoot(path, userId).then((data) => {
    res.status(200).send(data);
  });
});

// GET Request - Returns a list of favourites for a given user
router.get("/get-favourites", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  if (!decoded) {
    console.log("User not authenticated!");
    return res.sendStatus(401);
  }
  const query = { fileOwner: decoded.userId,
    isFavourited: true };
  QueryCollection(query, fileCollection).then((data) => {
    res.status(200).send(data);
  });
});

// GET Request - Returns the list of preferences for a given user
router.get("/get-preferences", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  if (!decoded) {
    console.log("User not authenticated!");
    return res.sendStatus(401);
  }
  GetDocumentById(decoded.userId, "users").then((data) => {
    if (data && data.length > 0 && data[0].userDefaults.preferences) {
      res.send(data[0].userDefaults.preferences); // Send only the userDefaults field
    } else {
      res.status(404).send({ error: "User defaults not found" });
    }
  });
});

// GET Request - Returns the base directory for a given user
router.get("/basedir", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  if (decoded) {
    GetBaseDir(decoded.userId).then((data) => {
      res.send({baseDir: data});
    });
  } else {
    console.log("User not authenticated!");
    res.sendStatus(401);
  }
});

// GET Request - Returns the current directory for a given user
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
    console.log(`Error: ${err}`);
    res.status(500).send({ error: "Error getting current directory" });
  }
});

// POST Request - Updates the current directory for a given user
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
    res.status(200).send({ message: `Current directory updated to ${currDir}` });
  } catch (err) {
    console.log(err);
    console.log("Error updating current directory");
    res.status(500).send({ error: "Error updating current directory" });
  }
});


// POST request - Handles a file download request for a given file ID
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
          res.download(`${path}.zip`, (err) => {
            if (err) {
              res.status(500).send("Error sending files to client");
            } else {
              // Delete zip file and extracted contents
              fs.unlink(`${path}.zip`, (err) => {
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

// POST request - Handles file renaming
router.post("/file-rename", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  const fileId = req.body.fileId;
  const newName = req.body.newName;
  if (!decoded) {
    console.log("User not authenticated!");
    return res.sendStatus(401);
  }
  GetDocumentById(fileId, "files").then((file) => {
    // Rename file here
    RenameFile(file[0], newName).then(() => {
      GetDocumentById(decoded.userId, "users").then((user) => {
        UpdateDocument(user[0], { ["userDefaults.lastSync"]: new Date() }, "users");
      });
      res.status(200).send(`${file[0].fileName + file[0].fileExt} renamed to ${newName}`);
    });
  });
});

// POST request - Handles file movement
router.post("/file-move", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  const fileId = req.body.fileId;
  const newPath = req.body.newPath;
  GetDocumentById(fileId, "files").then((file) => {
    // Move file here
    try {
      MoveFile(file[0], newPath).then(() => {
        // Update last sync time in user document
        GetDocumentById(decoded.userId, "users").then((user) => {
          UpdateDocument(user[0], { ["userDefaults.lastSync"]: new Date() }, "users");
        });
        res.status(200).send(`${file[0].fileName + file[0].fileExt} moved to ${newPath}`);
      });
    } catch (err) {
      console.log(err);
      res.status(500).send({message: "Error moving file"});
    }
  });
})

// GET request - Returns file info for a given file ID
router.get("/file-info", authenticateToken, (req, res) => {
  const fileId = req.query.fileId;
  GetDocumentById(fileId, "files").then((file) => {
    res.status(200).send(file[0]);
  });
});


// POST request - Returns whether a given file is favourited or not
router.post("/isfavourited", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  if (!decoded) {
    console.log("User not authenticated!");
    return res.sendStatus(401);
  }
  const fileId = req.body.fileId;
  GetDocumentById(fileId, "files").then((file) => {
    res.status(200).send({"isFavourited": file[0].isFavourited});
  });
});

// POST request - Toggles isFavourited attribute for a file, given the file ID
router.post("/toggle-favourite", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  if (!decoded) {
    console.log("User not authenticated!");
    return res.sendStatus(401);
  }
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

// POST request - Updates a given preference for the given user
router.post('/update-preference', authenticateToken, (req, res) => {
  const decoded = req.decoded;
  const preference = req.body.prefKey;
  const newValue = req.body.newValue;

  if (!decoded) {
    console.log("User not authenticated!");
    return res.sendStatus(401);
  }

  GetDocumentById(decoded.userId, 'users').then((user) => {
    const prefKey = `userDefaults.preferences.${preference}.prefValue`;

    UpdateDocument(user[0], { [prefKey]: newValue }, 'users').then(() => {
      res.send({ [preference]: newValue });
    });
  });
});

// POST request - Deletes a given file, given the file ID
router.post("/file-delete", authenticateToken, (req, res) => {
  const decoded = req.decoded;

  if (!decoded) {
    console.log("User not authenticated!");
    return res.sendStatus(401);
  }
  const fileId = req.body.fileId;
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
        res.send(`${file[0].fileName + file[0].fileExt} deleted`);
      } catch (err) {
        res.status(500).send("Error deleting directory");
      }
    } else {
      // Delete file here
      try {
        fs.rmSync(join(file[0].dirPath, file[0].fileName + file[0].fileExt));
        RemoveDocument(file[0], "files");
        // Update last sync time in user document
        GetDocumentById(decoded.userId, "users").then((user) => {
          UpdateDocument(user[0], { ["userDefaults.lastSync"]: new Date() }, "users");
        });
        res.status(200).send(`${file[0].fileName + file[0].fileExt} deleted`);
      } catch (err) {
        res.status(500).send("Error deleting file");
      }
    }
  });
});

// GET request - Returns server storage info i.e. total storage, used storage, available storage
router.get("/storage-info", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  if (decoded) {
    getStorageInfo().then((data) => {
      res.send(JSON.stringify(data));
    });
  } else {
    console.log("User not authenticated!");
    res.sendStatus(401);
  }
});

const createFolderIfNotExists = async (folderPath) => {
  try {
    await fs.promises.access(folderPath);
    return null;
  } catch {
    console.log(`Creating folder: ${folderPath}`);
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

const uploadMiddleware = upload.array("files");

// POST request - Implements multer middlewar and fandles file uploads to the server
router.post("/upload", authenticateToken, async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      uploadMiddleware(req, res, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    const userId = req.decoded.userId;
    const currDir = await GetCurrDir(userId);
    const filePaths = JSON.parse(req.body.filePaths);
    const files = req.files;

    if (allNull(filePaths)) {
      const metadataPromises = files.map(file => saveMetadata(file.path, userId));
      await Promise.all(metadataPromises);
    } else {
      const moveAndSavePromises = files.map(async (file, index) => {
        const srcPath = join(file.destination, file.filename);
        const targetPath = filePaths[index] !== null ? join(currDir, filePaths[index]) : join(currDir, file.filename);

        await createFolderIfNotExists(dirname(targetPath));
        await moveFile(srcPath, targetPath);
        await saveMetadata(targetPath, userId);
      });

      await Promise.all(moveAndSavePromises);
      await SyncDBWithFilesystem(currDir, userId)
    }

    // Update last sync time in user document
    GetDocumentById(userId, "users").then((user) => {
      UpdateDocument(user[0], { ["userDefaults.lastSync"]: new Date() }, "users");
    });
    res.status(201).send({message: "Files uploaded successfully"});
  } catch (error) {
    console.error('Error during file upload:', error);
    res.status(500).send({message: "An error occurred during file upload. Please try again."});
  }
});

// GET request - Returns the last sync time for the user
router.get('/last-sync', authenticateToken, (req, res) => {
  const decoded = req.decoded;
  if (decoded) {
    GetDocumentById(decoded.userId, "users").then((user) => {
      res.status(200).send({ lastSync: user[0].userDefaults.lastSync });
    });
  } else {
    console.log("User not authenticated!");
    res.status(401).send({error: "User not authenticated!"});
  }
});

// GET request - Syncs the filesystem with the database & vice versa
router.get('/sync', authenticateToken, (req, res) => {
  // Sync filesystem with database
  const decoded = req.decoded;
  if (decoded) {
    GetBaseDir(decoded.userId).then((baseDir) => {
      SyncDBWithFilesystem(baseDir, decoded.userId).then(() => {
        // Update last sync time in user document
        GetDocumentById(decoded.userId, "users").then((user) => {
          UpdateDocument(user[0], { ["userDefaults.lastSync"]: new Date() }, "users");
          res.status(201).send("Synced filesystem with database");
        });
      });
    });
  } else {
    console.log("User not authenticated!");
    res.sendStatus(401);
  }
});

// GET request - Returns the system process uptime
router.get('/sys-uptime', authenticateToken, (req, res) => {
  const decoded = req.decoded;
  if (decoded) {
    const uptime = process.uptime();
    res.status(200).send({ uptime });
  } else {
    console.log("User not authenticated!");
    res.sendStatus(401);
  }
});

// GET request - Queries 'files' collection to find files that match a given search term
router.post("/file-search", authenticateToken, (req, res) => {
  const decoded = req.decoded;
  const userId = decoded.userId;
  if (!decoded) {
    console.log("User not authenticated!");
    res.sendStatus(401);
  }

  try {
    const searchTerm = req.body.searchTerm;
    const searchByFileExt = searchTerm.startsWith(':');
    const cleanedSearchTerm = searchByFileExt ? searchTerm.slice(1) : searchTerm;
    if (cleanedSearchTerm.length < 1) {
      res.status(200).json(null);
      return;
    }
    const searchQuery = new RegExp(cleanedSearchTerm, "i");

    const pipeline = [
      {
        $addFields: {
          searchTermIndex: {
            $regexFind: {
              input: searchByFileExt ? "$fileExt" : "$fileName",
              regex: searchQuery,
            },
          },
        },
      },
      {
        $match: {
          "searchTermIndex.match": { $exists: true },
          [searchByFileExt ? 'fileExt' : 'fileName']: { $regex: searchQuery },
          fileOwner: userId,
        },
      },
      { $sort: { "searchTermIndex.idx": 1, lastViewed: -1, isFavourite: -1 } },
      { $project: { searchTermIndex: 0 } },
    ];

    QueryCollection(null, "files", pipeline).then((files) => {
      res.status(200).json(files);
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

// GET request - Streams a given file to the client
router.get('/user-files/:fileId', authenticateToken, async (req, res) => {
  const decoded = req.decoded;
  const fileId = req.params.fileId;

  if (!decoded) {
    console.log("User not authenticated!");
    res.sendStatus(401);
    return;
  }

  const file = await GetDocumentById(fileId, "files");
  const filePath = join(file[0].dirPath, file[0].fileName + file[0].fileExt);

  try {
    const stat = await fs.promises.stat(filePath);

    if (!stat.isFile()) {
      res.status(404).send("File not found");
      return;
    }

    UpdateDocument(file[0], { lastViewed: new Date() }, "files");

    let contentType = mime.getType(filePath);
    if (!contentType) {
      contentType = "text/plain";
    }
    if (contentType.startsWith("application") && !contentType.startsWith("application/pdf")) {
      contentType = "text/plain";
    }

    const range = req.headers.range;
    const fileSize = stat.size;
    const chunkSize = 65_536;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).send("Requested range not satisfiable");
        return;
      }

      const chunkEnd = Math.min(end, start + chunkSize - 1);
      const contentLength = chunkEnd - start + 1;
      const readStream = fs.createReadStream(filePath, { start, end });

      res.status(206)
        .setHeader("Content-Range", `bytes ${start}-${chunkEnd}/${fileSize}`)
        .setHeader("Accept-Ranges", "bytes")
        .setHeader("Content-Length", contentLength)
        .setHeader("Content-Type", contentType);

      readStream.pipe(res);

    } else {
      res.status(200)
        .setHeader("Content-Length", fileSize)
        .setHeader("Content-Type", contentType);

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});




// Catch errors and serve the appropriate error page
router.get((req, res, next) => {
  const status = err.status || 500;
  res.status(status);
  res.sendFile(join(__dirname, "views", `${status}.html`));
});

// Catch all other routes and return 404
router.get("*", (req, res, next) => {
  console.log("404");
  res.sendFile(join(__dirname, "views", "404.html"));
});


// This code exports the router object to make it available for other parts of the application.
export default router;
