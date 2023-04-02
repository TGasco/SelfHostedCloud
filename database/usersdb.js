import os from 'os';
import { stat as _stat } from 'fs';
import { join } from 'path';
import { GetDocumentById, InsertDocument, QueryCollection } from './dbops.js';
import { hashPassword, isValidInput } from './crypt.js';

// Credentials for root user: REMOVE THIS IN PRODUCTION
// Username: rootUser
// Password: rootUser123
const collectionName = "users";
const homedir = os.homedir();
const baseDir = join(homedir, "SelfHostedCloudDrive");

async function NewUser(userName, userPass, basedir=null, userDefaults=null) {
  var user;
  const hashedPass = await hashPassword(userPass);
  // console.log(hashedPass);
  basedir = null;
  if (basedir == null) {
    basedir = baseDir;
  }
  userPass = null;
  if (userDefaults == null) {
    user = {
      userName: userName,
      userPass: hashedPass,
      userDefaults: { baseDir: basedir,
                      lastSync: new Date(),
                      totalStorageUsed: 0,
                      totalStorage: 0,
                      theme: "light",
                      showFileExtensions: false, }
    };
  } else {
    user = {
      userName: userName,
      userPass: hashedPass,
      userDefaults: userDefaults
    };
  }

  try {
    return InsertDocument(user, collectionName);
  } catch (err) {
    console.log(err);
  }
}

async function SetDefaults(userId) {
  const user = await GetUserById(userId);
  user[0].userDefaults = {};
  return await UpdateDocument(user, collectionName);
}

async function UpdateLastSync(userId) {
  const user = await GetUserById(userId);
  user[0].userDefaults.lastSync = new Date();
  return await UpdateDocument(user, collectionName);
}

function GetUserById(id) {
  return GetDocumentById(id, collectionName);
}

async function GetUserByCreds(userName) {
  const query = { userName: userName };
  return await QueryCollection(query, collectionName);
}

async function GetBaseDir(userId) {
  const user = await GetDocumentById(userId, collectionName);
  return user[0].userDefaults.baseDir;
}


export { NewUser, GetBaseDir, GetUserById, GetUserByCreds };
