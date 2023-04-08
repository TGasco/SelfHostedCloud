// Connect to the MongoDB database
import { MongoClient } from "mongodb";
import fs from "fs";
import os from "os";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { stat as _stat } from "fs";
import { dirname, join } from "path";
import { ObjectId } from "mongodb";

// Define the MongoDB connection URI
const uri = "mongodb://127.0.0.1:27017";
const dbName = "MyCloudDrive";

async function CountDocuments(collectionName) {
  const client = new MongoClient(uri, { useNewUrlParser: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const count = await collection.countDocuments();
    return count;
  } catch (error) {
    console.error(error);
  } finally {
    client.close();
  }
}

async function GetAllDocuments(collectionName) {
  return QueryCollection({}, collectionName);
}

async function QueryCollection(query, collectionName, pipeline = null) {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    let documents;
    if (pipeline) {
      documents = await collection.aggregate(pipeline).toArray();
    } else {
      documents = await collection.find(query).toArray();
    }

    return documents;
  } catch (error) {
    console.error(error);
  } finally {
    client.close();
  }
}


async function GetDocumentById(id, collectionName) {
  let objectId;

  await new Promise((resolve, reject) => {
    if (typeof id == "string") {
      objectId = new ObjectId(id);
      resolve(objectId);
    } else {
      objectId = id;
      resolve(objectId);
    }
  });

  try {
    return QueryCollection({ _id: objectId }, collectionName);
  } catch (error) {
    console.error(error);
  }
}

async function DocumentExists(document, collectionName) {
  const client = new MongoClient(uri, { useNewUrlParser: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const exists = await collection.findOne(document);
    if (exists) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(error);
  } finally {
    client.close();
  }
}

async function InsertDocument(document, collectionName) {
  const client = new MongoClient(uri, { useNewUrlParser: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Check if document already exists in database, skip if it does
    const exists = await DocumentExists(document, collectionName);

    if (exists) {
      console.log("Document already exists in database!");
    } else {
      const result = await collection.insertOne(document); // Inserts the document, comment out for debugging
      console.log("Inserted 1 document into the collection");
      return result;
    }
  } catch (err) {
    console.log(err.stack);
    return err;
  } finally {
    client.close();
  }
}

async function RemoveDocument(document, collectionName) {
  const client = new MongoClient(uri, { useNewUrlParser: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    // Check if document exists in database, throw error if it doesn't
    const exists = await DocumentExists(document, collectionName);
    if (!exists) {
      throw "Document does not exist in database!";
    } else {
      const result = await collection.deleteOne(document);
      console.log("Removed 1 document from the collection");
    }

  } catch (err) {
    console.log(err.stack);
  } finally {
    client.close();
  }
}

async function UpdateDocument(document, updatedPairs, collectionName) {
  const client = new MongoClient(uri, { useNewUrlParser: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const updatePipeline = [
      {$set: updatedPairs},
      {$replaceWith: "$$ROOT"},
    ]

    await collection.updateOne({ "_id" : document._id }, updatePipeline
    ).then((result) => {
      if (result.modifiedCount === 0) {
        throw "Could not update document.";
      } else {
        console.log("Updated 1 document from the collection: " + result.modifiedCount);
        return result;
      }
    });
  } catch (err) {
    console.log(err.stack);
  } finally {
    client.close();
  }
}

function GetDBSchema(collection=null) {
  // Read the schema from the JSON file
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const schemaFilePath = join(__dirname, '..', 'database', 'dbSchema.json');
  const schemaJSON = fs.readFileSync(schemaFilePath);
  const schema = JSON.parse(schemaJSON);
  if (collection) {
    return schema[collection];
  } else {
    return schema;
  }
}

function checkAndUpdateAttributes(document, schema, updatedPairs, currentPath) {
  const documentAttributes = Object.keys(document);
  const schemaAttributes = Object.keys(schema);

  // Remove deprecated attributes
  for (const attribute of documentAttributes) {
    if (!schemaAttributes.includes(attribute)) {
      // Skip the _id attribute
      if (attribute === '_id') continue;

      const deprecatedAttributePath = currentPath ? currentPath + '.' + attribute : attribute;
      updatedPairs[deprecatedAttributePath] = undefined;
    }
  }

  // Add missing attributes and update existing ones
  for (const attribute in schema) {
    const currentAttributePath = currentPath ? currentPath + '.' + attribute : attribute;

    if (typeof schema[attribute] === 'object' && !Array.isArray(schema[attribute])) {
      if (!document.hasOwnProperty(attribute)) {
        document[attribute] = schema[attribute];
      }

      checkAndUpdateAttributes(document[attribute], schema[attribute], updatedPairs, currentAttributePath);
    } else {
      if (!document.hasOwnProperty(attribute)) {
        updatedPairs[currentAttributePath] = getDefaultAttributeValue(schema[attribute]);
      }
    }
  }
}



// Function to get default attribute value based on the type
function getDefaultAttributeValue(type) {
  switch (type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'date':
      return new Date();
    case 'boolean':
      return false;
    default:
      return null;
  }
}


async function updateAllCollections() {
  const client = new MongoClient(uri, { useNewUrlParser: true });

  const schema = GetDBSchema();

  try {
    await client.connect();
    const db = client.db(dbName);

    for (const collectionName in schema) {
      const collection = db.collection(collectionName);

      // Fetch all documents from the collection
      const documents = await collection.find({}).toArray();

      // Loop through each document
      for (const document of documents) {
        const updatedPairs = {};

        // Check and update attributes
        checkAndUpdateAttributes(document, schema[collectionName], updatedPairs, '');

        // Update the document with the new attributes, if any
        if (Object.keys(updatedPairs).length > 0) {
          await UpdateDocument(document, updatedPairs, collectionName);
        }
      }
    }
  } catch (err) {
    console.log(err.stack);
  } finally {
    client.close();
  }
}

async function getTotalStorageUsed() {
  const client = new MongoClient(uri, { useUnifiedTopology: true });

  try {
    await client.connect();

    const db = client.db(dbName);
    const collection = db.collection("files");

    const result = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$fileSize' }
        }
      }
    ]).toArray();

    return result[0]?.totalSize || 0;
  } catch (error) {
    console.error('Error connecting to the database:', error);
    return 0;
  } finally {
    await client.close();
  }
}

function GetFreeStorage() {
    return new Promise((resolve, reject) => {
        if (os.type() === 'Windows_NT') {
            exec('wmic logicaldisk get size,freespace', (error, stdout) => {
                if (error) {
                    reject(error);
                    return;
                }

                const lines = stdout.trim().split('\n');
                let totalFreeSpace = 0;
                lines.slice(1).forEach(line => {
                    const [size, freeSpace] = line.trim().split(/\s+/);
                    totalFreeSpace += Number(freeSpace);
                });

                resolve(totalFreeSpace);
            });
        } else {
            exec('df -Pk . | sed 1d | grep -v used | awk \'{ print $4 "\\t" }\'', (error, stdout) => {
                if (error) {
                    reject(error);
                    return;
                }

                const freeSpaceKb = Number(stdout.trim().split('\t')[0]);
                const totalFreeSpace = freeSpaceKb * 1024;

                resolve(totalFreeSpace);
            });
        }
    });
}





async function getStorageInfo() {
  const freeStorage = await GetFreeStorage();
  const usedStorage = await getTotalStorageUsed('files');

  return {
    usedStorage,
    freeStorage,
    totalStorage: usedStorage + freeStorage
  };
}


export {
  CountDocuments,
  QueryCollection,
  GetDocumentById,
  DocumentExists,
  InsertDocument,
  RemoveDocument,
  UpdateDocument,
  updateAllCollections,
  GetDBSchema,
  getDefaultAttributeValue,
  getStorageInfo
};
