// This code imports the Express.js module and creates a new router object.
import express from 'express';
let router = express.Router();
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
router.get('/', function(req, res) {
    res.setHeader('Content-type', 'text/html');
    res.sendFile('./' + 'public/index.html');
});
// This code sets up a new route for a GET request to the '/login' path,
// and defines a callback function to handle the request.
// The callback function sets the 'Content-type' header of the response to 'text/html',
// and sends back the contents of a file named 'login.html' located in a 'public' folder.
router.get('/login', function(req, res) {
    res.setHeader('Content-type', 'text/html');
    res.sendFile('./' + 'public/login.html');
});

// This code sets up a new route for a POST request to the '/login' path,
// and defines a callback function to handle the request.
// The callback function sends a response with the message 'Login successful'.
router.post('/login', function(req, res) {
    res.send('Login successful');
});

// This code exports the router object to make it available for other parts of the application.
export default router;
