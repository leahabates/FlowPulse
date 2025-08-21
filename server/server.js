// Description: Flow Pulse Air Quality API Server
// Author: Leah 

require("dotenv").config(); //loads environment varibales from .env
const express = require("express"); // imports the Express.js web framework
const fetch = require("node-fetch"); // imports node.js 
const path = require("path"); // this is a node builtin path module for jandling and joining filesystem paths

const { runQueries } = require("./database.js"); // imports a custum function runQueries from the database.js file, used for saving results

const app = express(); // creates an express app, app
const PORT = 8000; // defines the servers port as 8000

// Load .env variables
const apiKey = process.env.AIRNOW_API_KEY; //gets the api from .env
const defaultRadius = process.env.AIRNOW_RADIUS; //gets the radius from .env

console.log("API KEY:", apiKey); // logs the api to confirm it was loaded correctly

// Serve static files from /html
app.use(express.static(path.join(__dirname, "../html"))); //server files  (HTML,JS) from the var/www/html folder, and makes the apo double as a web server

// CORS Middleware
//sets CORS heasers so brower can request my API from any domain
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
  next();
});

// Hello Route, simple test endpoint to confim the server is running
app.get("/hello", (req, res) => {
  res.send({ message: "Hello from Flow Pulse Air Quality API" });
});

// Geocode function for ReportingArea
//gers the coordinates fro an area and reutrns an object that include lat and lon
async function geocodeArea(area, state) {
  const query = encodeURIComponent(`${area}, ${state}`); //bulds a search string to put in a url
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`; //creates a search url

  try {
    const res = await fetch(url, { headers: { "User-Agent": "FlowPulseApp" } }); // sends a HTTP request and waits for a response
    const data = await res.json(); // parses the HTTP response as a JSON , data will be an array of place objects
    if (data[0]) { // checks if data has at least one result
      return { Latitude: parseFloat(data[0].lat), Longitude: parseFloat(data[0].lon) }; // if there is a reult it will return a numeric lat and long as a number
    }
  } catch (err) { // if any things goes wrong its will handle error here
    console.error("Geocode error for", area, state, err);
  }// default returnso the function always resoloves
  return { Latitude: null, Longitude: null };
}

// Air Quality Forecast Route
app.get("/airquality", async (req, res) => { // defines an endpoint
  try {
    // Get user coordinates from query parameters
    const latitude = req.query.lat; 
    const longitude = req.query.lon;

    if (!latitude || !longitude) { // if lat or lon is missing sents an 400 bad request with an error message
      return res.status(400).send({ error: "Missing latitude or longitude parameters." });
    }

    const radius = req.query.radius || defaultRadius; // read an optional radius querey parameter if not the fall pack is provided from .env

    const apiUrl = `https://www.airnowapi.org/aq/forecast/latLong/?format=JSON&latitude=${latitude}&longitude=${longitude}&distance=${radius}&API_KEY=${apiKey}`;
    console.log("/airquality route: Fetching from URL:", apiUrl); // contrucst the APU url with the needed parameters and console logs for debugging

    const apiResponse = await fetch(apiUrl); // fetcehs the data fro AirNow and waits for a response
    let data = await apiResponse.json(); // parese the respons JSON into a object and assignes it to data

    // Geocode each reporting area only if lat/lon missing
    data = await Promise.all( // iterates through each forcast record 
      data.map(async (item) => {
        const coords = item.Latitude && item.Longitude // if Airnow recor alreay has lat along it keps otherwise uses geocodeArea to look up the cooridiantes  based on reporting area
          ? { Latitude: item.Latitude, Longitude: item.Longitude }
          : await geocodeArea(item.ReportingArea, item.StateCode);

        return { // bulids new object and enusres the lat and log are set to real values, where they think you are
          ...item,
          Latitude: coords.Latitude,
          Longitude: coords.Longitude,
        };
      })
    );

    res.json(data); // sends the processed forecase data bak to client as JSON

    // Write to CSV and Postgres DB
    runQueries(data);

  } catch (err) { // if anything fails logs the error
    console.error("/airquality route: Error:", err);
    res.status(500).send({ error: "Error fetching air quality data." });
  }
});

// Live Current Air Quality Route
app.get("/live", async (req, res) => { // defins another toute 
  try { // extracts the lat an lon query parameters from the request
    const latitude = req.query.lat; 
    const longitude = req.query.lon;

    if (!latitude || !longitude) { // handles error if lat or lon is missing
      return res.status(400).send({ error: "Missing latitude or longitude parameters." });
    }
    // bults the AirNow Observation API and ues format application/json (different from the forecast route)
    const apiUrl = `https://www.airnowapi.org/aq/observation/latLong/?format=application/json&latitude=${latitude}&longitude=${longitude}&distance=${defaultRadius}&API_KEY=${apiKey}`;
    console.log("/live route: Fetching from URL:", apiUrl);

    const apiResponse = await fetch(apiUrl); // fetches the data from Airnow 
    const data = await apiResponse.json(); // parese in into JSON

    const current = data.sort((a, b) => new Date(b.DateObserved) - new Date(a.DateObserved))[0] || {}; //sorts the observations by date
    res.json(current); // sends more rescent observation back to client in JSON form
  } catch (err) { // hangles errors and logs context
    console.error("/live route: Error:", err);
    res.status(500).send({ error: "Error fetching live air quality data." });
  }
});


// Start Server
app.listen(PORT, "0.0.0.0", () => { //strarts the express server and makes it listen on all avaible network interfaces
  console.log(`Flow Pulse API Server listening on port ${PORT}`); // tellsyou when its running
});
