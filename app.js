// Name:        app.js
// Description: simple node.js and express app

// Import the express module
var express = require('express');

// Initialize express by instantiating it and assign a variable 
// called 'app' to it
var app = express();

// Root Route
app.get('/', function (req, res) {
  console.log("in app.js.  The root route has been hit ...")
  res.status(200)
  res.send('Hello World - from my new Geog 576 node.js express app!');
});

// App listens on Port 8000 for requests
app.listen(8000, function (err) {
  if (err) {
    console.log("Error starting server.  Msg: " + err);
    process.exit(1)
  }else {
  console.log('Node.js and Express app listening on port 8000!');
  }
});