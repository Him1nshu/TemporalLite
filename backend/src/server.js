require("dotenv").config();

const { app } = require("./app");
const { initializeDatabase } = require("./db");

const port = Number.parseInt(process.env.PORT || "3000", 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`TemporalLite API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Unable to initialize PostgreSQL database.", error);
    process.exitCode = 1;
  });
