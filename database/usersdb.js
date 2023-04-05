import os from 'os';
import { stat as _stat } from 'fs';
import { join } from 'path';
import { GetDocumentById, InsertDocument, QueryCollection, GetDBSchema, getDefaultAttributeValue } from './dbops.js';
import { hashPassword, isValidInput } from './crypt.js';

// Credentials for root user: REMOVE THIS IN PRODUCTION
// Username: rootUser
// Password: rootUser123
const collectionName = "users";

async function NewUser(userName, userPass, basedir) {
  var userData;
  const hashedPass = await hashPassword(userPass);

  userPass = null;
  const schema = await GetDBSchema(collectionName);
  userData = {
    userName: userName,
    userPass: hashedPass,
    userDefaults: { baseDir: basedir,
                    lastSync: new Date(),
                    totalStorageUsed: 0,
                    totalStorage: 0,
                    preferences: { theme: {prefString: "Theme",
                                   prefOptions: ["light", "dark"], prefValue: "light"},
                                   showFileExtensions: { prefString: "Show File Extensions",
                                  prefOptions: [true, false],
                                  prefValue: false  } } }
  };

  for (const [key, value] of Object.entries(schema)) {
    if (key in userData) {
      schema[key] = userData[key];
    } else {
      schema[key] = getDefaultAttributeValue(value);
    }
  }

  try {
    const result = await InsertDocument(schema, collectionName);
    return result;
  } catch (err) {
    console.log(err);
  }
}

async function SetDefaults(userId, defaults=null) {
  if (defaults === null) {
    defaults =     {
    userName: userName,
    userPass: hashedPass,
    userDefaults: { baseDir: basedir,
                    lastSync: new Date(),
                    totalStorageUsed: 0,
                    totalStorage: 0,
                    preferences: { theme: "light",
                                    showFileExtensions: false, }}
    }
  }
  const user = await GetUserById(userId);
  user[0].userDefaults = {
    baseDir: defaults.baseDir,
  };
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
