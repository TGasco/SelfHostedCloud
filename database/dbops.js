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
    return await collection.countDocuments();
  } catch (error) {
    console.error(error);
  } finally {
    client.close();
  }
}

/**
 * Sends an empty query to the database to retrieve all documents in the given collection
 * @param {*} collectionName - The name of the collection to query
 * @returns {Promise} - A promise that resolves to an array of documents
 */
async function GetAllDocuments(collectionName) {
  return QueryCollection({}, collectionName);
}

/**
 * Queries the given collection to find documents matching the given query.
 * Can either send a basic query or a pipeline query.
 * @param {*} query - The query to send to the database
 * @param {*} collectionName - The name of the collection to query
 * @param {*} pipeline - The pipeline to send to the database
 * @returns {Promise<Document>} - A promise that resolves to an array of documents
 */
async function QueryCollection(query, collectionName, pipeline = null) {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    return pipeline
      ? await collection.aggregate(pipeline).toArray()
      : await collection.find(query).toArray();
  } catch (error) {
    console.error(error);
  } finally {
    client.close();
  }
}

/**
 * Retreives a document from the given collection by its unique ObjectID.
 * @param {*} id - The ObjectID of the document to retrieve
 * @param {*} collectionName - The name of the collection to query
 * @returns {Promise<Document>} - A promise that resolves to the document with the given ObjectID
 */
async function GetDocumentById(id, collectionName) {
  let objectId;

  await new Promise((resolve, reject) => {
    objectId = typeof id == "string" ? new ObjectId(id) : id;
    resolve(objectId);
  });

  try {
    return QueryCollection({ _id: objectId }, collectionName);
  } catch (error) {
    console.error(error);
  }
}

/**
 * Performs a check to see if a document exists in the given collection.
 * @param {*} document - The document to check for
 * @param {*} collectionName - The name of the collection to query
 * @returns {Promise<boolean>} - A promise that resolves to a boolean value indicating whether the document exists or not
 */
async function DocumentExists(document, collectionName) {
  const client = new MongoClient(uri, { useNewUrlParser: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const exists = await collection.findOne(document);
    return exists ? true : false;
  } catch (error) {
    console.error(error);
  } finally {
    client.close();
  }
}

/**
 * Performs an insert operation to the given collection.
 * @param {*} document - The document to insert
 * @param {*} collectionName - The name of the collection to insert into
 * @returns {Promise} - A promise that resolves to the result of the insert operation
 */
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

/**
 * Performs a delete operation on the given document in the given collection.
 * @param {*} document - The document to delete
 * @param {*} collectionName - The name of the collection to delete from
 */
async function RemoveDocument(document, collectionName) {
  const client = new MongoClient(uri, { useNewUrlParser: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    // Check if document exists in database, throw error if it doesn't
    const exists = await DocumentExists(document, collectionName);
    if (exists) {
      const result = await collection.deleteOne(document);
      console.log("Removed 1 document from the collection");
    } else {
      throw "Document does not exist in database!";
    }
  } catch (err) {
    console.log(err.stack);
  } finally {
    client.close();
  }
}

/**
 * Performs an update operation on the given document in the given collection.
 * @param {*} document - The document to update
 * @param {*} updatedPairs - The updated key-value pairs to replace the old ones
 * @param {*} collectionName - The name of the collection to update
 */
async function UpdateDocument(document, updatedPairs, collectionName) {
  const client = new MongoClient(uri, { useNewUrlParser: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const updatePipeline = [{ $set: updatedPairs }, { $replaceWith: "$$ROOT" }];

    await collection
      .updateOne({ _id: document._id }, updatePipeline)
      .then((result) => {
        if (result.modifiedCount === 0) {
          throw "Could not update document.";
        } else {
          console.log(
            `Updated 1 document from the collection: ${result.modifiedCount}`
          );
          return result;
        }
      });
  } catch (err) {
    console.log(err.stack);
  } finally {
    client.close();
  }
}

/**
 * Retrieves the schema for the given collection.
 * @param {*} collection - The name of the collection to retrieve the schema for
 * @returns {JSON} - The schema for the given collection
 */
function GetDBSchema(collection = null) {
  // Read the schema from the JSON file
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const schemaFilePath = join(__dirname, "..", "database", "dbSchema.json");
  const schemaJSON = fs.readFileSync(schemaFilePath);
  const schema = JSON.parse(schemaJSON);
  return collection ? schema[collection] : schema;
}

/**
 * Checks for new or deprecated attributes in the given document and updates the document accordingly.
 * @param {*} document - The document to check for new or deprecated attributes
 * @param {*} schema - The schema to check the document against
 * @param {*} updatedPairs - The updated key-value pairs to replace the old ones
 * @param {*} currentPath - The current path of the document
 */
function checkAndUpdateAttributes(document, schema, updatedPairs, currentPath) {
  const documentAttributes = Object.keys(document);
  const schemaAttributes = Object.keys(schema);

  // Remove deprecated attributes
  for (const attribute of documentAttributes) {
    if (!schemaAttributes.includes(attribute)) {
      // Skip the _id attribute
      if (attribute === "_id") continue;

      const deprecatedAttributePath = currentPath
        ? `${currentPath}.${attribute}`
        : attribute;
      updatedPairs[deprecatedAttributePath] = undefined;
    }
  }

  // Add missing attributes and update existing ones
  for (const attribute in schema) {
    const currentAttributePath = currentPath
      ? `${currentPath}.${attribute}`
      : attribute;

    if (
      typeof schema[attribute] === "object" &&
      !Array.isArray(schema[attribute])
    ) {
      if (!document.hasOwnProperty(attribute)) {
        document[attribute] = schema[attribute];
      }

      checkAndUpdateAttributes(
        document[attribute],
        schema[attribute],
        updatedPairs,
        currentAttributePath
      );
    } else if (!document.hasOwnProperty(attribute)) {
      updatedPairs[currentAttributePath] = getDefaultAttributeValue(
        schema[attribute]
      );
    }
  }
}


/**
 * Returns the default value for the given attribute type.
 * @param {string} type - The type of the attribute
 * @returns {*} - The default value for the given attribute type
*/
function getDefaultAttributeValue(type) {
  switch (type) {
    case "string":
      return "";
    case "number":
      return 0;
    case "date":
      return new Date();
    case "boolean":
      return false;
    default:
      return null;
  }
}

/**
 * Check for updates in all collections and update the documents accordingly.
 */
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
        checkAndUpdateAttributes(
          document,
          schema[collectionName],
          updatedPairs,
          ""
        );

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


/**
 * Returns the storage size of all files in the database.
 * @returns {number} - The total size of all files in the database (in bytes)
 */
async function getTotalStorageUsed() {
  const client = new MongoClient(uri, { useUnifiedTopology: true });

  try {
    await client.connect();

    const db = client.db(dbName);
    const collection = db.collection("files");

    const result = await collection
      .aggregate([
        {
          $group: {
            _id: null,
            totalSize: { $sum: "$fileSize" },
          },
        },
      ])
      .toArray();

    return result[0]?.totalSize || 0;
  } catch (error) {
    console.error("Error connecting to the database:", error);
    return 0;
  } finally {
    await client.close();
  }
}

/**
 * Returns the free storage space on the disk where the database is located.
 * @returns {number} - The free storage space on the disk where the database is located (in bytes)
 */
function GetFreeStorage() {
  return new Promise((resolve, reject) => {
    if (os.type() === "Windows_NT") {
      exec("wmic logicaldisk get size,freespace", (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        const lines = stdout.trim().split("\n");
        let totalFreeSpace = 0;
        lines.slice(1).forEach((line) => {
          const [, freeSpace] = line.trim().split(/\s+/);
          totalFreeSpace += Number(freeSpace);
        });

        resolve(totalFreeSpace);
      });
    } else {
      exec(
        "df -Pk . | sed 1d | grep -v used | awk '{ print $4 \"\\t\" }'",
        (error, stdout) => {
          if (error) {
            reject(error);
            return;
          }

          const freeSpaceKb = Number(stdout.trim().split("\t")[0]);
          const totalFreeSpace = freeSpaceKb * 1024;

          resolve(totalFreeSpace);
        }
      );
    }
  });
}

/**
 * Wrapper function for getting the storage info.
 * @returns {JSON} - The storage info
 */
async function getStorageInfo() {
  const freeStorage = await GetFreeStorage();
  const usedStorage = await getTotalStorageUsed("files");

  return {
    usedStorage,
    freeStorage,
    totalStorage: usedStorage + freeStorage,
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
  getStorageInfo,
};
