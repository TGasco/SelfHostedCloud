// Connect to the MongoDB database
import { MongoClient, MongoTopologyClosedError } from 'mongodb';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { stat as _stat, access, F_OK, lstatSync } from 'fs';
import { basename, extname, dirname, join } from 'path';

// Define the MongoDB connection URI
const uri = "mongodb://127.0.0.1:27017"
const dbName = "self-hosted-cloud";
const collectionName = "userCredentials";

const homedir = os.homedir();
const baseDir = join(homedir, "SelfHostedCloudDrive");

// Define the schema for the documents
const userDefaultsSchema = new mongoose.Schema({
  baseDir: { type: String, default: baseDir }
});

const userCredentialsSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  userPass: { type: String, required: true },
  userDefaults: { type: userDefaultsSchema, required: true }
});

const UserCredentialsModel = mongoose.model('UserCredentials', userCredentialsSchema, collectionName);

async function NewUser(userName, userPass, userDefaults=null) {
  if (userDefaults == null) {
    const user = new UserCredentialsModel({
      userName: userName,
      userPass: userPass
    });
  } else {
    const user = new UserCredentialsModel({
      userName: userName,
      userPass: userPass,
      userDefaults: userDefaults
    });
  }

  try {
    const result = await user.save();
    console.log(result);
  } catch (err) {
    console.log(err);
  }
}
