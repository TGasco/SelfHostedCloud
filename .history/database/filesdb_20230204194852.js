// Connect to the MongoDB database
import { MongoClient, MongoTopologyClosedError } from 'mongodb';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { stat as _stat, access, F_OK, lstatSync } from 'fs';
import { basename, extname, dirname, join } from 'path';
const uri = "mongodb://127.0.0.1:27017"
// const client = new MongoClient(uri, { useNewUrlParser: true });
// client.connect(err => {
//   const collection = client.db("cloud_server").collection("files");
//   // perform actions on the collection object
//   client.close();
// });

const dbName = "self-hosted-cloud"
const collectionName = "myDrive"

// Define the file metadata schema
const fileSchema = {
  fileNaem: String,
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
const File = mongoose.model("myDrive", fileSchema);

function MongoConnect(dbName, collectionName) {
    const client = new MongoClient(uri, { useNewUrlParser: true });
    client.connect(err => {
    const collection = client.db(dbName).collection(collectionName);
    console.log("Connected successfully to database!");
    // perform actions on the collection object
    client.close();
    });
}

async function InsertDocument(document) {
    const client = new MongoClient(uri, { useNewUrlParser: true });
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);
        const result = await collection.insertOne(document);
        console.log('Inserted 1 document into the collection');
    } catch (err) {
        console.log(err.stack);
    } finally {
        client.close();
    }
}

async function GetAllDocuments() {
  return QueryCollection({});
}

async function QueryCollection(query) {
  const client = new MongoClient(uri, { useNewUrlParser: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const documents = await collection.find(query).toArray();
    return documents;
  } catch (error) {
    console.error(error);
  } finally {
    client.close();
  }
}

async function GetDocumentsWithRoot(root) {
  var query = { "dirPath" : root };
  return QueryCollection(query);
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
    return !file.startsWith('.'); // Ingores hidden files
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
      console.log('Valid path')
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
      console.log("Path does not exist!")
      return false;
  }
}

function InsertFilesystem(dir) {
  walkDir(dir).then(files => {
    for (let i = 0; i < files.length; i++) {
      if (typeof files[i] === 'object') {
        // Directory!
        getFileMetadata(files[i].dir).then(metadata => {console.log(metadata)});
        for (let j = 0; j < files[i].files.length; j++) {
          getFileMetadata(files[i].files[j]).then(metadata => {console.log(metadata)});
        }
      } else {
        // File!
        getFileMetadata(files[i]).then(metadata => {console.log(metadata)});
      }
    }
  });
}

export {InsertDocument, GetAllDocuments, GetDocumentsWithRoot, walkDir, InsertFilesystem};
