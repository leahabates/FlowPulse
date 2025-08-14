// server.js
// Description: Flow Pulse Air Quality API Server
// Author: Leah / Adapted from GEOG 576 template

// server/server.js
require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = 8000;

// Load .env variables
const apiKey = process.env.AIRNOW_API_KEY;
const defaultLat = process.env.AIRNOW_LATITUDE;
const defaultLon = process.env.AIRNOW_LONGITUDE;
const defaultRadius = process.env.AIRNOW_RADIUS;

console.log("API KEY:", apiKey);
console.log("Latitude:", defaultLat);
console.log("Longitude:", defaultLon);

// Serve static files from /var/www/html
app.use(express.static(path.join(__dirname, "../html")));

// CORS Middleware (optional if frontend is on same server)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // Allow all origins
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
  next();
});

// -----------------------
// Hello Route
// -----------------------
app.get("/hello", (req, res) => {
  res.send({ message: "Hello from Flow Pulse Air Quality API" });
});

// -----------------------
// Air Quality Forecast Route
// -----------------------
app.get("/airquality", async (req, res) => {
  try {
    const latitude = req.query.lat || defaultLat;
    const longitude = req.query.lon || defaultLon;
    const radius = req.query.radius || defaultRadius;

    const apiUrl = `https://www.airnowapi.org/aq/forecast/latLong/?format=JSON&latitude=${latitude}&longitude=${longitude}&distance=${radius}&API_KEY=${apiKey}`;
    console.log("/airquality route: Fetching from URL:", apiUrl);

    const apiResponse = await fetch(apiUrl);
    const data = await apiResponse.json();

    res.json(data);
  } catch (err) {
    console.error("/airquality route: Error:", err);
    res.status(500).send({ error: "Error fetching air quality data." });
  }
});

// -----------------------
// Live Current Air Quality Route
// -----------------------
app.get("/live", async (req, res) => {
  try {
    const latitude = req.query.lat || defaultLat;
    const longitude = req.query.lon || defaultLon;

    const apiUrl = `https://www.airnowapi.org/aq/observation/latLong/?format=application/json&latitude=${latitude}&longitude=${longitude}&distance=${defaultRadius}&API_KEY=${apiKey}`;
    console.log("/live route: Fetching from URL:", apiUrl);

    const apiResponse = await fetch(apiUrl);
    const data = await apiResponse.json();

    // Return the most recent observation
    const current = data.sort((a, b) => new Date(b.DateObserved) - new Date(a.DateObserved))[0] || {};
    res.json(current);
  } catch (err) {
    console.error("/live route: Error:", err);
    res.status(500).send({ error: "Error fetching live air quality data." });
  }
});

// -----------------------
// Start Server
// -----------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Flow Pulse API Server listening on port ${PORT}`);
});
