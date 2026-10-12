const express = require("express");
const {
  createJobHandler,
  listJobsHandler,
  getJobHandler,
  deleteJobHandler,
} = require("../controllers/job-controller");

function createJobRouter() {
  const router = express.Router();

  router.post("/", createJobHandler);
  router.get("/", listJobsHandler);
  router.get("/:id", getJobHandler);
  router.delete("/:id", deleteJobHandler);

  return router;
}

module.exports = { createJobRouter };
