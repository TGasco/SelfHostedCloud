import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

function checkEnvSetup() {
    return fs.existsSync(path.join(process.cwd(), '.env')) ? true : false;
}

async function setupMongoDB() {
  const uri = 'mongodb://localhost:27017';
  const dbName = 'MyCloudDrive';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const dbExists = (await client.db().admin().listDatabases()).databases.some(db => db.name === dbName);

    if (!dbExists) {
      const db = client.db(dbName);
      // Set up your collections and any indexes you need here
      console.log('Creating collections...');
      await db.createCollection('users');
      await db.createCollection('files');
    }
  } finally {
    await client.close();
  }
}

async function generateSecrets() {
  // Generate a random 32-byte secret for Access Tokens
  let accessTokenSecret = crypto.randomBytes(32).toString('hex');
  // Generate a random 32-byte secret for Refresh Tokens
  let refreshTokenSecret = crypto.randomBytes(32).toString('hex');
  // Write the secrets to the .env file
  fs.writeFileSync(path.join(process.cwd(), '.env'), `ACCESS_TOKEN_SECRET=${accessTokenSecret}\nREFRESH_TOKEN_SECRET=${refreshTokenSecret}`);
  // unset the secrets from memory
  accessTokenSecret = null;
  refreshTokenSecret = null;
  console.log('Secrets generated');
}

export async function setup() {
    if (checkEnvSetup()) {
        console.log('Environment already set up');
        // Set the environment variables
        const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
        const envVars = env.split('\n'); // Split the file into an array of lines
        envVars.forEach(line => {
            const [key, value] = line.split('='); // Split each line into an array of [key, value]
            process.env[key] = value; // Set the environment variable
        });
        return;
    }
  await setupMongoDB();
  await generateSecrets();
  const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  const envVars = env.split('\n'); // Split the file into an array of lines
  envVars.forEach(line => {
      const [key, value] = line.split('='); // Split each line into an array of [key, value]
      process.env[key] = value; // Set the environment variable
  });
  console.log('Environment set up complete');

}
