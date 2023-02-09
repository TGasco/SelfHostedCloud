// Connect to the MongoDB database
const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb://127.0.0.1:27017"
// const client = new MongoClient(uri, { useNewUrlParser: true });
// client.connect(err => {
//   const collection = client.db("cloud_server").collection("files");
//   // perform actions on the collection object
//   client.close();
// });

dbName = "self-hosted-cloud"
collectionName = "myDrive"

// Define the file metadata schema
const fileSchema = new mongoose.Schema({
  fileNaem: String,
  fileExt: String,
  fileFize: Number,
  lastModified: Date,
  filePath: String,
  lastViewed: Date,
  isFavourited: Boolean,
  isDirectory: Boolean,
  uploadDate: Date
});

// Create a model for the file metadata
const File = mongoose.model("File", fileSchema);

function MongoConnect(dbName, collectionName) {
    const client = new MongoClient(uri, { useNewUrlParser: true });
    client.connect(err => {
    const collection = client.db(dbName).collection(collectionName);
    console.log("Connected successfully to database!");
    // perform actions on the collection object
    client.close();
    });
}

function InsertDocument(file) {
    const client = new MongoClient(uri, { useNewUrlParser: true });
    client.connect(err => {
    const collection = client.db(dbName).collection(collectionName);
    collection.insertOne(fileSchema, function(err, res) {
        if (err) throw err;
        console.log("1 document inserted");
        client.close();
    });
    });
}

// add a schema to the database
function AddSchema(fileSchema) {
    const client = new MongoClient(uri, { useNewUrlParser: true });
    client.connect(err => {
    const collection = client.db(dbName).collection(collectionName);
    collection.createIndex(fileSchema, function(err, res) {
        if (err) throw err;
        console.log("1 schema added");
        client.close();
    });
    });
}
