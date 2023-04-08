// Connect to the MongoDB database
import path from 'path';
import fs from 'fs';
import os from 'os';
import archiver from 'archiver';
import { stat as _stat, access, F_OK, lstatSync } from 'fs';
import { basename, extname, dirname } from 'path';
import { InsertDocument, QueryCollection, UpdateDocument, GetDBSchema, getDefaultAttributeValue, RemoveDocument } from './dbops.js';
// Define the MongoDB connection URI
const uri = "mongodb://127.0.0.1:27017"
const dbName = "MyCloudDrive";
const collectionName = "files";

async function GetDocumentsWithRoot(root, userId, deep=false) {
  if (deep) {
    var query = new RegExp("^" + root + "(\\/.*)*$");
    return QueryCollection({ "dirPath" : { $regex: query } }, collectionName);
  } else {
    var query = { "fileOwner": userId, "dirPath": root };
  }
  return QueryCollection(query, collectionName);
}

async function GetAllUserFiles(userId) {
  return QueryCollection({ fileOwner: userId }, collectionName);
}

async function walkDir(dir, callback) {
  const files = await fs.promises.readdir(dir);
  for (const file of files) {
    if (file.startsWith('.')) {
      continue; // Skip hidden files and directories
    }

    const filepath = path.join(dir, file);
    const stats = await fs.promises.stat(filepath);

    callback(filepath);

    if (stats.isDirectory()) {
      await walkDir(filepath, callback);
    }
  }
}

function getFileMetadata(filePath) {
  // First we need to check whether the path is valid!
  // console.log(filePath);
  if (pathExists(filePath)) {
    console.log("Path does not exist at " + filePath + "!");
    return null;
  }
  // Initialise variables
  const fileData = {}

  fileData.fileName = basename(filePath, extname(filePath));
  fileData.dirPath = dirname(filePath);
  fileData.fileExt = extname(filePath);
  fileData.isDirectory = isDir(filePath);
  fileData.isFavourited = false;
  return new Promise(function(resolve, reject) {
    _stat(filePath, function(err, stats) {
      //Checking for errors
      if(err){
          reject(err);
      }
      else {
        //Logging the stats Object
        fileData.fileSize = stats.size;
        fileData.lastModified = stats.mtime;
        fileData.lastViewed = stats.atime;
        fileData.uploadDate = stats.birthtime;
        const schema = GetDBSchema(collectionName);
        // iterate over each schema element, and set its value to the corresponding key in the fileData object
        for (const [key, value] of Object.entries(schema)) {
          if (key in fileData) {
            schema[key] = fileData[key];
          } else {
            schema[key] = getDefaultAttributeValue(value);
          }

        }
        resolve(schema);
      }
    });
  })
}

function pathExists(filePath) {
  access(filePath, F_OK, function(err) {
    if (err) {
      console.error(err)
      return false
    } else {
      return true
    }
  })
}

function isDir(path) {
  try {
      var stat = lstatSync(path);
      return stat.isDirectory();
  } catch (e) {
      // lstatSync throws an error if path doesn't exist
      console.log("Path: " + path + " does not exist!");
      return false;
  }
}

function ZipDir(source, callback) {
  const target = source + '.zip';
  const stream = fs.createWriteStream(target);
  const archive = archiver('zip', { zlib: { level: 9 } });

  stream.on('close', function() {
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
    console.log("Zip file created at " + target);
    callback(null);
  });

  archive.on('error', function(err) {
    console.log("Error creating zip file! (1)");
    callback(err);
  });

  archive.pipe(stream);
  archive.directory(source, false);

  archive.finalize(function(err) {
    if (err) {
      console.log("Error creating zip file! (2)");
      callback(err);
    } else {
      console.log('Zip file created: ' + target);
      callback(null);
    }
  });
}

async function InsertFilesystem(dir, userId) {
  walkDir(dir, (filePath) => {
    // Check if the file exists in the database)
    const dirName = dirname(filePath);
    const fileExt = extname(filePath);
    const baseName = basename(filePath, fileExt);
    const query = { dirPath: dirName, fileName: baseName, fileExt: fileExt, fileOwner: userId };
    QueryCollection(query, collectionName).then(result => {
      if (result.length == 0) {
        getFileMetadata(filePath).then(metadata => {
          metadata.fileOwner = userId;
          InsertDocument(metadata, collectionName);
        });
      } else {
        // console.log("File already exists in database: " + filePath + "/" + baseName + fileExt);
      }
    });
  });
}

async function SyncDBWithFilesystem(dir, userId) {
  console.log("Syncing database with filesystem...");
  // Walk over the filesystem and insert any new files
  await InsertFilesystem(dir, userId);
  // Check for any files that have been deleted and remove them from the database
  await GetAllUserFiles(userId).then(async documents => {
    for (let i = 0; i < documents.length; i++) {
      const filePath = path.join(documents[i].dirPath, documents[i].fileName + documents[i].fileExt);
      try {
        await fs.promises.access(filePath);
      } catch (err) {
        console.log("Deleting " + filePath);
        RemoveDocument(documents[i], collectionName);
      }
    }
  });
}

async function MoveFile(file, newPath, userId) {
  // Move the file on the host filesystem
  const oldPath = path.join(file.dirPath, file.fileName);
  // Update the records in the database
  try {
    // Updates any descendants of the old path to the new path
    await GetDocumentsWithRoot(oldPath, userId, true).then(documents => {
      console.log(documents);
      if (documents.length > 0) {
        for (let i = 0; i < documents.length; i++) {
          const oldfPath = path.join(documents[i].dirPath);
          const newfPath = oldfPath.replace(oldPath, path.join(newPath, file.fileName));
          UpdateDocument(documents[i], {"dirPath": newfPath}, collectionName);
          console.log("Updating " + oldfPath + " to " + newfPath);
        }
      }
    });

    const currentDate = new Date();
    await UpdateDocument(file, {"dirPath" : newPath, "lastModified" : currentDate}, collectionName);
    console.log("Moving " + file.fileName + " from " + file.dirPath +  " to " + newPath + " at " + currentDate);

  } catch (error) {
    console.error(error);
  } finally {
    fs.rename(oldPath + file.fileExt, path.join(newPath, file.fileName + file.fileExt), (err) => {
        if (err) {
            console.log(err);
        } else {
            console.log("Successfully renamed the file!");
        }
    });
  }

}

async function RenameFile(file, newName, userId) {
  // Rename the file on the host filesystem
  const oldName = file.fileName;
  const dir = file.dirPath;
  const oldPath = path.join(dir, oldName);
  const newPath = path.join(dir, newName);

  // Update the records in the database
  try {
    // Updates any descendants of the old path to the new path
    await GetDocumentsWithRoot(oldPath, userId, true).then(documents => {
      if (documents.length > 0) {
        for (let i = 0; i < documents.length; i++) {
          const oldPath = path.join(documents[i].dirPath);
          const newPath = oldPath.replace(oldName, newName);
          UpdateDocument(documents[i], {"dirPath": newPath}, collectionName);
          console.log("Updating " + oldPath + " to " + newPath);
        }
      }
    });

    const currentDate = new Date();
    await UpdateDocument(file, {"fileName" : newName, "lastModified" : currentDate}, collectionName);
    console.log("Updating " + oldName + " to " + newName + " at " + currentDate);

  } catch (error) {
    console.error(error);
  } finally {
    fs.rename(oldPath + file.fileExt, newPath + file.fileExt, (err) => {
        if (err) {
            console.log(err);
        } else {
            console.log("Successfully renamed the file!");
        }
    });
  }
}

async function CreateDirectoryIfNotExists(directoryPath) {
  try {
    // Check if the directory exists
    await fs.promises.access(directoryPath);
    console.log(`Directory '${directoryPath}' already exists.`);
  } catch (error) {
    // If the directory does not exist, create it
    if (error.code === 'ENOENT') {
      await fs.promises.mkdir(directoryPath, { recursive: true });
      console.log(`Directory '${directoryPath}' has been created.`);
    } else {
      console.error('Error while checking directory existence:', error);
      throw error;
    }
  }
}

export { GetDocumentsWithRoot, InsertFilesystem, RenameFile, MoveFile, ZipDir, getFileMetadata, CreateDirectoryIfNotExists, SyncDBWithFilesystem };
