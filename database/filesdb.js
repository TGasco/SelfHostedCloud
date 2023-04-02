// Connect to the MongoDB database
import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { stat as _stat, access, F_OK, lstatSync } from 'fs';
import { basename, extname, dirname } from 'path';
import { InsertDocument, QueryCollection, UpdateDocument } from './dbops.js';
// Define the MongoDB connection URI
const uri = "mongodb://127.0.0.1:27017"
const dbName = "MyCloudDrive";
const collectionName = "files";

// Define the file metadata schema
const fileSchema = {
  fileName: String,
  fileExt: String,
  fileFize: Number,
  lastModified: Date,
  filePath: String,
  lastViewed: Date,
  isFavourited: Boolean,
  isDirectory: Boolean,
  uploadDate: Date
};

// Create a model for the file metadata
const File = mongoose.model("files", fileSchema, collectionName);

async function GetDocumentsWithRoot(root, deep=false) {
  if (deep) {
    var query = new RegExp("^" + root + "(\\/.*)*$");
    return QueryCollection({"dirPath" : { $regex: query } }, collectionName);
  } else {
    var query = { "dirPath" : root };
  }
  return QueryCollection(query, collectionName);
}

async function walkDir(dir) {
  const files = await new Promise((resolve, reject) => {
    fs.readdir(dir, (error, files) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(files);
    });
  });

  const promises = files.filter((file) => {
    return !file.startsWith('.'); // Ignores hidden files
  }).map(async (file) => {
    const filePath = path.join(dir, file);
    const stat = await new Promise((resolve, reject) => {
      fs.stat(filePath, (error, stat) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stat);
      });
    });

    if (stat.isDirectory()) {
      const subFiles = await walkDir(filePath);
      return { dir: filePath, files: subFiles };
    } else {
      return filePath;
    }
  });

  return Promise.all(promises);
}

function getFileMetadata(filePath, callback) {
  // First we need to check whether the path is valid!
  // console.log(filePath);
  if (pathExists(filePath)) {
    console.log("Path does not exist at " + filePath + "!");
    return null;
  }
  // Initialise variables
  var fileName;
  var fileExt;
  var fileSize;
  var lastModified;
  var dirPath;
  var lastViewed;
  var isFavourited = false;
  var isDirectory;
  var uploadDate;

  fileName = basename(filePath, extname(filePath));
  dirPath = dirname(filePath);
  fileExt = extname(filePath);
  isDirectory = isDir(filePath);
  return new Promise(function(resolve, reject) {
    _stat(filePath, function(err, stats) {
      //Checking for errors
      if(err){
          reject(err);
      }
      else {
        //Logging the stats Object
        fileSize = stats.size;
        lastModified = stats.mtime;
        lastViewed = stats.atime;
        uploadDate = stats.birthtime;

        resolve({
          "fileName": fileName,
          "fileExt": fileExt,
          "dirPath": dirPath,
          "fileSize": fileSize,
          "lastModified": lastModified,
          "lastViewed": lastViewed,
          "uploadDate": uploadDate,
          "isFavourited": isFavourited,
          "isDirectory": isDirectory,
        });
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

function ExpandDir(dirPath) {
  // Directory!
  if (typeof dirPath === 'object') {
    getFileMetadata(dirPath.dir).then(metadata => {InsertDocument(metadata, collectionName)});
    for (let j = 0; j < dirPath.files.length; j++) {
      ExpandDir(dirPath.files[j]);
    }
  } else {
    getFileMetadata(dirPath).then(metadata => {InsertDocument(metadata, collectionName)});
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

function InsertFilesystem(dir) {
  walkDir(dir).then(files => {
    for (let i = 0; i < files.length; i++) {
      if (typeof files[i] === 'object') {
        ExpandDir(files[i]);
      } else {
        getFileMetadata(files[i]).then(metadata => {InsertDocument(metadata, collectionName)});
      }
    }
  });
}

async function RenameFile(file, newName) {
  // Rename the file on the host filesystem
  const oldName = file.fileName;
  const dir = file.dirPath;
  const oldPath = path.join(dir, oldName);
  const newPath = path.join(dir, newName);
  const query = {fileName: oldName, dirPath: dir};

  // Rename the file on the host filesystem: Comment out for testing

  // Update the records in the database
  const client = new MongoClient(uri, { useNewUrlParser: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    // Updates any descendants of the old path to the new path
    await GetDocumentsWithRoot(oldPath, true).then(documents => {
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
    client.close();
  }
}

export { GetDocumentsWithRoot, walkDir, InsertFilesystem, RenameFile, ZipDir, getFileMetadata};
