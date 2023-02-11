// Connect to the MongoDB database
import { MongoClient, MongoTopologyClosedError } from 'mongodb';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { stat as _stat, access, F_OK, lstatSync } from 'fs';
import { basename, extname, dirname, join } from 'path';
import { GetDocumentById, InsertDocument } from './dbops.js';

// Define the MongoDB connection URI
const uri = "mongodb://127.0.0.1:27017"
const dbName = "self-hosted-cloud";
const collectionName = "userCredentials";
const userId = "63e6d759ecbacadf9cc52f25";

const homedir = os.homedir();
const baseDir = join(homedir, "SelfHostedCloudDrive");

async function NewUser(userName, userPass, userDefaults=null) {
  var user;
  if (userDefaults == null) {
    user = {
      userName: userName,
      userPass: userPass,
      userDefaults: { baseDir: baseDir }
    };
  } else {
    user = {
      userName: userName,
      userPass: userPass,
      userDefaults: userDefaults
    };
  }

  try {
    return InsertDocument(user, collectionName);
  } catch (err) {
    console.log(err);
  }
}

function GetUserId() {
  return userId;
}

async function GetBaseDir() {
  const userId = GetUserId();
  const user = await GetDocumentById(userId, collectionName);
  return user[0].userDefaults.baseDir;
}

export { NewUser, GetUserId, GetBaseDir };
