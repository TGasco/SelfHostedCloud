import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

function checkEnvSetup() {
    if (fs.existsSync(path.join(process.cwd(), '.env-setup'))) {
        return true;
    } else {
        return false;
    }
}

function installPrerequisites() {
    const { exec } = require('child_process');
    exec('npm install', (err, stdout, stderr) => {
        if (err) {
            console.log(err);
        } else {
            console.log(stdout);
        }
    });
}

async function setupMongoDB() {
  const uri = 'mongodb://localhost:27017';
  const dbName = 'MyCloudDrive';
  const client = new MongoClient(uri);

  try {
    await client.connect();

    // Replace 'yourDatabase' with the actual database name you want to use
    const dbExists = (await client.db().admin().listDatabases()).databases.some(db => db.name === dbName);

    if (!dbExists) {
      const db = client.db(dbName);
      // Set up your collections and any indexes you need here
        await db.createCollection('users');
        await db.createCollection('files');
    }
  } finally {
    await client.close();
  }
}
