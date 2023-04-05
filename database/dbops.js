// Connect to the MongoDB database
import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import fs from "fs";
import { fileURLToPath } from "url";
import { stat as _stat, access, F_OK, lstatSync } from "fs";
import { basename, extname, dirname, join } from "path";
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

// async function QueryCollection(query, collectionName) {
//   const client = new MongoClient(uri, { useNewUrlParser: true });
//   try {
//     await client.connect();
//     const db = client.db(dbName);
//     const collection = db.collection(collectionName);
//     const documents = await collection.find(query).toArray();
//     return documents;
//   } catch (error) {
//     console.error(error);
//   } finally {
//     client.close();
//   }
// }

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

async function getTotalStorageUsed(collectionName) {
  const client = new MongoClient(uri, { useUnifiedTopology: true });

  try {
    await client.connect();

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

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
        document[attribute] = {};
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

// ... other functions from the previous response


export {
  CountDocuments,
  GetAllDocuments,
  QueryCollection,
  GetDocumentById,
  DocumentExists,
  InsertDocument,
  RemoveDocument,
  UpdateDocument,
  getTotalStorageUsed,
  updateAllCollections,
  GetDBSchema,
  getDefaultAttributeValue,
};
