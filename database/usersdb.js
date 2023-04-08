import { stat as _stat } from 'fs';
import { GetDocumentById, InsertDocument, QueryCollection, GetDBSchema } from './dbops.js';
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

async function GetCurrDir(userId) {
  const user = await GetDocumentById(userId, collectionName);
  return user[0].userDefaults.currDir;
}


export { NewUser, GetBaseDir, GetCurrDir, GetUserById, GetUserByCreds };
