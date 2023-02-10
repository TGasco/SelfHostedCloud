// This code imports the Express.js module and creates a new router object.
import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GetDocumentsWithRoot } from '../database/filesdb.js';
import os from 'os';
let router = express.Router();

const __dirname = dirname(fileURLToPath(import.meta.url));
const homedir = os.homedir();
const baseDir = join(homedir, "SelfHostedCloudDrive");

const fileCollection = "myDrive";
const userCollection = "userCredentials";

router.get('/myDrive', function(req, res) {
    res.setHeader('Content-type', 'text/html');
    res.sendFile(__dirname + '/' + 'public/index.html');
});
// This code sets up a new route for a GET request to the '/login' path,
// and defines a callback function to handle the request.
// The callback function sets the 'Content-type' header of the response to 'text/html',
// and sends back the contents of a file named 'login.html' located in a 'public' folder.
router.get('/login', function(req, res) {
    res.setHeader('Content-type', 'text/html');
    res.sendFile(__dirname + '/' + 'public/login.html');
});

// This code sets up a new route for a POST request to the '/login' path,
// and defines a callback function to handle the request.
// The callback function sends a response with the message 'Login successful'.
router.post('/login', function(req, res) {
    res.send('Login successful');
});

// GET Requests
router.get('/metadata', (req, res) => {
    const currDir = req.query.relpath;
    console.log(currDir);
    GetDocumentsWithRoot(join(baseDir, currDir)).then(data => {res.send(data)});
});

router.get('/basedir', (req, res) => {
    res.send(baseDir);
});

router.get('/fileCollection', (req, res) => {
    res.send(fileCollection);
});

router.get('/userCollection', (req, res) => {
    res.send(userCollection);
});

function VerifyRoute() {

}

// This code exports the router object to make it available for other parts of the application.
export default router;
