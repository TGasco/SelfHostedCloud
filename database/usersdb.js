import os from 'os';
import { stat as _stat } from 'fs';
import { join } from 'path';
import { GetDocumentById, InsertDocument, QueryCollection } from './dbops.js';
import { hashPassword } from './crypt.js';

const collectionName = "userCredentials";
const userId = "63e6d759ecbacadf9cc52f25";
// Username: test
// Password: test
const homedir = os.homedir();
const baseDir = join(homedir, "SelfHostedCloudDrive");

async function NewUser(userName, userPass, userDefaults=null) {
  var user;
  const hashedPass = await hashPassword(userPass);
  console.log(hashedPass);
  userPass = null;
  if (userDefaults == null) {
    user = {
      userName: userName,
      userPass: hashedPass,
      userDefaults: { baseDir: baseDir }
    };
  } else {
    user = {
      userName: userName,
      userPass: hashedPass,
      userDefaults: userDefaults
    };
  }

  try {
    // return InsertDocument(user, collectionName);
    return
  } catch (err) {
    console.log(err);
  }
}

function GetUserId() {
  return userId;
}

function GetUserById(id) {
  return GetDocumentById(id, collectionName);
}

async function GetUserByCreds(userName) {
  const query = { userName: userName };
  return await QueryCollection(query, collectionName);
}

async function GetBaseDir() {
  const userId = GetUserId();
  const user = await GetDocumentById(userId, collectionName);
  return user[0].userDefaults.baseDir;
}


export { NewUser, GetUserId, GetBaseDir, GetUserById, GetUserByCreds };
