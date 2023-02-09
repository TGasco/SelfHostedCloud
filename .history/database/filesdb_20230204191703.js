// Connect to the MongoDB database
import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
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
      var files = [filePath];
      var subFiles = await walkDir(filePath);
      return files.concat(subFiles);
      // return { dir: filePath, files: subFiles };
    } else {
      return filePath;
    }
  });

  return Promise.all(promises);
}

export {InsertDocument, GetAllDocuments, GetDocumentsWithRoot, walkDir};
