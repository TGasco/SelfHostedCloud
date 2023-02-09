// Connect to the MongoDB database
const MongoClient = require('mongodb').MongoClient;
const uri = ""
const client = new MongoClient(uri, { useNewUrlParser: true });
client.connect(err => {
  const collection = client.db("cloud_server").collection("files");
  // perform actions on the collection object
  client.close();
});

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

function MongoConnect() {
    const client = new MongoClient(uri, { useNewUrlParser: true });
    client.connect(err => {
    const collection = client.db("cloud_server").collection("files");
    // perform actions on the collection object
    client.close();
    });
}
