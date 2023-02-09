// Connect to the MongoDB database
import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

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
    // client.connect(err => {
    // const collection = client.db(dbName).collection(collectionName);
    // console.log("Document Contents: \n" + document);
    // collection.insertOne(document, function(err, res) {
    //     if (err) throw err;
    //     console.log("1 document inserted");
    //     client.close();
    // });
    // });
}

export default InsertDocument;
