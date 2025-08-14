require("dotenv").config({path:'../.env'});

const express = require("express");
const fetch = require("node-fetch");


const app = express();
const PORT = 8000;

// Load .env variables
const apiKey = process.env.AIRNOW_API_KEY;
const lat = process.env.AIRNOW_LATITUDE;
const lon = process.env.AIRNOW_LONGITUDE;
const radius = process.env.AIRNOW_RADIUS || 25;  // fallback

// Sample hello route
app.get('/hello', (req, res) => {
  res.send({ message: "Hello from Air Quality App" });
});

// Air Quality Forecast Route
app.get('/airquality', async (req, res) => {
  const scriptName = "/airquality route:";

  try {
    const apiUrl = `https://www.airnowapi.org/aq/forecast/latLong/?format=JSON&latitude=${lat}&longitude=${lon}&distance=${radius}&API_KEY=${apiKey}`;

    console.log(`${scriptName} Fetching from URL: ${apiUrl}`);

    const apiResponse = await fetch(apiUrl);
    const data = await apiResponse.json();

    console.log(`${scriptName} Response data:`, data);

    res.json(data);
  } catch (err) {
    console.error(`${scriptName} Error:`, err);
    res.status(500).send("Error fetching air quality data.");
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
