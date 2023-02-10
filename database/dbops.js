// Connect to the MongoDB database
import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { stat as _stat, access, F_OK, lstatSync } from 'fs';
import { basename, extname, dirname, join } from 'path';

// Define the MongoDB connection URI
// const uri = "mongodb://127.0.0.1:27017";
const mongoUser = "Admin";
const mongoPass = "hygfa7-tyjnaf-fohpUd";
const uri = `mongodb+srv://${mongoUser}:${mongoPass}@self-hosted-cloud.iofm1d0.mongodb.net/?retryWrites=true&w=majority`;
const dbName = "self-hosted-cloud";

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
    return QueryCollection({"_id" : id}, collectionName);
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
        const exists = await DocumentExists(document);

        if (exists) {
          console.log("Document " + document._id + " already exists in database!");
        } else {
          const result = await collection.insertOne(document); // Inserts the document, comment out for debugging
          console.log('Inserted 1 document into the collection');
        }
    } catch (err) {
        console.log(err.stack);
    } finally {
        client.close();
    }
}

const documentExists = async (document) => {
    let client;
    try {
      client = await MongoClient.connect('mongodb://localhost/test', { useNewUrlParser: true });
      const db = client.db('test');
      const collection = db.collection('posts');
      const query = Object.entries(document).reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
      const existingPost = await collection.findOne(query);
      return existingPost !== null;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      if (client) {
        client.close();
      }
    }
  };

export { CountDocuments, GetAllDocuments, QueryCollection, GetDocumentById, DocumentExists, InsertDocument, documentExists}
