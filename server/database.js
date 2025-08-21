// Name: database.js
// Description: Write AirNow JSON directly into Postgres
// Author: Leah Bates

const { Pool } = require("pg"); //imports pg module and pulls out pool which mangages multiple database connections
require("dotenv").config(); // loads environment varibles from .env

// Postgres connection pool, this creates the connection 
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

// Insert Air Quality JSON into DB
module.exports.runQueries = async function (json) { // exports the function so other files can use it
  console.log("database.js: runQueries()");// logs when the function starts

  //defines a paramerter for SQL INSERT statment
  const query = `INSERT INTO ${process.env.dbTable}  
  (time_stamp, reporting_area, state_code, parameter_name, aqi, category_number, category_name, action_day, discussion, latitude, longitude)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11);`;
// insert loop, loops through each item in the JSON array
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
         // bulilds a array of values for one row in the DB
        await pool.query(query, values);// exectures the sql queries with the prepared values
        console.log("Inserted record:", item.ReportingArea, item.ParameterName); // logs message that confirmts the insert
      })
    );

    console.log("database.js: Finished inserting all records."); //logs a final success messages
  } catch (err) { //if anything fails the error is cought
    console.error("database.js: runQueries() error:", err.stack);
  }
};
