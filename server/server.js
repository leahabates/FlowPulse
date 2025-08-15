// Description: Flow Pulse Air Quality API Server
// Author: Leah / Adapted from GEOG 576 template

require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const { runQueries } = require("./database.js"); // DB write

const app = express();
const PORT = 8000;

// Load .env variables
const apiKey = process.env.AIRNOW_API_KEY;
const defaultRadius = process.env.AIRNOW_RADIUS;

console.log("API KEY:", apiKey);

// Serve static files from /html
app.use(express.static(path.join(__dirname, "../html")));

// CORS Middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
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
// Geocode function for ReportingArea
// -----------------------
async function geocodeArea(area, state) {
  const query = encodeURIComponent(`${area}, ${state}`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

  try {
    const res = await fetch(url, { headers: { "User-Agent": "FlowPulseApp" } });
    const data = await res.json();
    if (data[0]) {
      return { Latitude: parseFloat(data[0].lat), Longitude: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.error("Geocode error for", area, state, err);
  }
  return { Latitude: null, Longitude: null };
}

// -----------------------
// Air Quality Forecast Route
// -----------------------
app.get("/airquality", async (req, res) => {
  try {
    // Get user coordinates from query parameters
    const latitude = req.query.lat;
    const longitude = req.query.lon;

    if (!latitude || !longitude) {
      return res.status(400).send({ error: "Missing latitude or longitude parameters." });
    }

    const radius = req.query.radius || defaultRadius;

    const apiUrl = `https://www.airnowapi.org/aq/forecast/latLong/?format=JSON&latitude=${latitude}&longitude=${longitude}&distance=${radius}&API_KEY=${apiKey}`;
    console.log("/airquality route: Fetching from URL:", apiUrl);

    const apiResponse = await fetch(apiUrl);
    let data = await apiResponse.json();

    // Geocode each reporting area only if lat/lon missing
    data = await Promise.all(
      data.map(async (item) => {
        const coords = item.Latitude && item.Longitude
          ? { Latitude: item.Latitude, Longitude: item.Longitude }
          : await geocodeArea(item.ReportingArea, item.StateCode);

        return {
          ...item,
          Latitude: coords.Latitude,
          Longitude: coords.Longitude,
        };
      })
    );

    res.json(data);

    // Write to CSV and Postgres DB
    runQueries(data);

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
    const latitude = req.query.lat;
    const longitude = req.query.lon;

    if (!latitude || !longitude) {
      return res.status(400).send({ error: "Missing latitude or longitude parameters." });
    }

    const apiUrl = `https://www.airnowapi.org/aq/observation/latLong/?format=application/json&latitude=${latitude}&longitude=${longitude}&distance=${defaultRadius}&API_KEY=${apiKey}`;
    console.log("/live route: Fetching from URL:", apiUrl);

    const apiResponse = await fetch(apiUrl);
    const data = await apiResponse.json();

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
