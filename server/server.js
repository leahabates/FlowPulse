// server.js
// Description: Flow Pulse Air Quality API Server
// Author: Leah / Adapted from GEOG 576 template

require("dotenv").config({ path: "../.env" });

const express = require("express");
const fetch = require("node-fetch");

const app = express();
const PORT = 8000;

// Load .env variables
const apiKey = process.env.AIRNOW_API_KEY;
const defaultLat = process.env.AIRNOW_LATITUDE;
const defaultLon = process.env.AIRNOW_LONGITUDE;
const defaultRadius = process.env.AIRNOW_RADIUS || 25;

// ---------------------------------------------------
// URL of Elastic IP Address for EC2 Server + PORT #
// ---------------------------------------------------
const serverURL = "http://54.163.150.220:8000";

// -----------------------
// CORS Middleware (Elastic IP Only)
// -----------------------
const allowedOrigins = [serverURL];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
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
// Accepts optional query parameters: ?lat=&lon=&radius=
// -----------------------
app.get("/airquality", async (req, res) => {
  const scriptName = "/airquality route:";

  try {
    const latitude = req.query.lat || defaultLat;
    const longitude = req.query.lon || defaultLon;
    const radius = req.query.radius || defaultRadius;

    const apiUrl = `https://www.airnowapi.org/aq/forecast/latLong/?format=JSON&latitude=${latitude}&longitude=${longitude}&distance=${radius}&API_KEY=${apiKey}`;

    console.log(`${scriptName} Fetching from URL: ${apiUrl}`);

    const apiResponse = await fetch(apiUrl);
    const data = await apiResponse.json();

    console.log(`${scriptName} Response data received. Items: ${data.length}`);

    res.json(data);
  } catch (err) {
    console.error(`${scriptName} Error:`, err);
    res.status(500).send({ error: "Error fetching air quality data." });
  }
});

// -----------------------
// Nearby Stations Route
// Accepts URL params: /stations/:lat,:lon
// -----------------------
app.get("/stations/:latitude,:longitude", async (req, res) => {
  const scriptName = "/stations route:";

  try {
    const latitude = req.params.latitude || defaultLat;
    const longitude = req.params.longitude || defaultLon;

    const apiUrl = `https://www.airnowapi.org/aq/observation/latLong/?format=application/json&latitude=${latitude}&longitude=${longitude}&distance=${defaultRadius}&API_KEY=${apiKey}`;

    console.log(`${scriptName} Fetching from URL: ${apiUrl}`);

    const apiResponse = await fetch(apiUrl);
    const data = await apiResponse.json();

    console.log(`${scriptName} Response data received. Items: ${data.length}`);

    res.json(data);
  } catch (err) {
    console.error(`${scriptName} Error:`, err);
    res.status(500).send({ error: "Error fetching nearby stations." });
  }
});

// -----------------------
// Live Current Air Quality Route
// Accepts query parameters: ?lat=&lon=
// -----------------------
app.get("/live", async (req, res) => {
  const scriptName = "/live route:";

  try {
    const latitude = req.query.lat || defaultLat;
    const longitude = req.query.lon || defaultLon;

    const apiUrl = `https://www.airnowapi.org/aq/observation/latLong/?format=application/json&latitude=${latitude}&longitude=${longitude}&distance=${defaultRadius}&API_KEY=${apiKey}`;

    console.log(`${scriptName} Fetching current air quality from URL: ${apiUrl}`);

    const apiResponse = await fetch(apiUrl);
    const data = await apiResponse.json();

    // Return the most recent observation
    const current = data.sort((a, b) => new Date(b.DateObserved) - new Date(a.DateObserved))[0] || {};

    console.log(`${scriptName} Current air quality:`, current);

    res.json(current);
  } catch (err) {
    console.error(`${scriptName} Error:`, err);
    res.status(500).send({ error: "Error fetching live air quality data." });
  }
});

// -----------------------
// Start Server
// -----------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Flow Pulse API Server listening on port ${PORT}`);
});
