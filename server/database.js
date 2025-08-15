// Name: database.js
// Description: Write AirNow JSON directly into Postgres
// Author: Adapted for FlowPulse

const { Pool } = require("pg");
require("dotenv").config();

// -----------------------------------
// Postgres connection pool
// -----------------------------------
const pool = new Pool({
  database: process.env.targetDB,
  user: process.env.pgUser,
  password: process.env.pgPassword,
  host: process.env.pgHost,
  port: process.env.pgPort,
  max: 2,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 10000,
});

// -----------------------------------
// Insert Air Quality JSON into DB
// -----------------------------------
module.exports.runQueries = async function (json) {
  console.log("database.js: runQueries()");

  const query = `INSERT INTO ${process.env.dbTable} 
  (time_stamp, reporting_area, state_code, parameter_name, aqi, category_number, category_name, action_day, discussion, latitude, longitude)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11);`;

  try {
    await Promise.all(
      json.map(async (item) => {
        const values = [
          new Date().toISOString(), // unique timestamp
          item.ReportingArea || "",
          item.StateCode || "",
          item.ParameterName || "",
          item.AQI || 0,
          item.Category?.Number || 0,
          item.Category?.Name || "",
          item.ActionDay || false,
          item.Discussion || "",
          item.Latitude || 0,
          item.Longitude || 0,
        ];

        await pool.query(query, values);
        console.log("Inserted record:", item.ReportingArea, item.ParameterName);
      })
    );

    console.log("database.js: Finished inserting all records.");
  } catch (err) {
    console.error("database.js: runQueries() error:", err.stack);
  }
};
