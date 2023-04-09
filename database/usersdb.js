import { stat as _stat } from 'fs';
import { GetDocumentById, InsertDocument, QueryCollection, GetDBSchema, UpdateDocument } from './dbops.js';
import { hashPassword } from './crypt.js';

const collectionName = "users";

async function NewUser(userName, userPass, basedir) {
  var userData;
  const hashedPass = await hashPassword(userPass);

  userPass = null;
  const schema = await GetDBSchema(collectionName);
  userData = {
    userName: userName,
    userPass: hashedPass,
  };

  for (const [key, value] of Object.entries(schema)) {
    if (userData[key] == undefined) {
      userData[key] = value;
    }
  }

  userData.userDefaults.baseDir = basedir;
  userData.userDefaults.currDir = basedir;
  userData.userDefaults.lastSync = new Date();

  try {
    const result = await InsertDocument(userData, collectionName);
    return result;
  } catch (err) {
    console.log(err);
    return null;
  }
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
  console.log(user[0].userDefaults.baseDir);
  return user[0].userDefaults.baseDir;
}

async function GetCurrDir(userId) {
  const user = await GetDocumentById(userId, collectionName);
  if (user[0].userDefaults.currDir == null) {
    UpdateDocument(user[0], { ["userDefaults.currDir"]: user[0].userDefaults.baseDir }, collectionName);
    return user[0].userDefaults.baseDir;
  }
  return user[0].userDefaults.currDir;
}

async function UpdateRefreshToken(userId, refreshToken) {
  const user = await GetDocumentById(userId, collectionName);
  return await UpdateDocument(user[0], { refreshToken: refreshToken }, collectionName);
}


export { NewUser, GetBaseDir, GetCurrDir, GetUserById, GetUserByCreds, UpdateRefreshToken, };
