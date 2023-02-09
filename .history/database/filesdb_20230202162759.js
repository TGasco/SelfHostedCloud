// Connect to the MongoDB database
const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://<username>:<password>@cluster.mongodb.net/test?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true });
client.connect(err => {
  const collection = client.db("test").collection("files");
  // perform actions on the collection object
  client.close();
});

// Define the file metadata schema
const fileSchema = new mongoose.Schema({
  name: String,
  extension: String,
  size: Number,
  lastModified: Date,
  path: String,
  lastViewed: Date,
  isFavourited: Boolean,
  isDirectory: Boolean,
  uploadedDate: Date
});

// Create a model for the file metadata
const File = mongoose.model("File", fileSchema);
