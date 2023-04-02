// Connect to the MongoDB database
import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
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

async function QueryCollection(query, collectionName) {
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
    console.log(updatedPairs);

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

export {
  CountDocuments,
  GetAllDocuments,
  QueryCollection,
  GetDocumentById,
  DocumentExists,
  InsertDocument,
  RemoveDocument,
  UpdateDocument,
  getTotalStorageUsed
};
