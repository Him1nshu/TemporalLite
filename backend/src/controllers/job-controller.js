const {
  createJob,
  listJobs,
  findJob,
  deleteJob,
} = require("../store/job-store");

function validateCreateJob(body) {
  const errors = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return ["Request body must be a JSON object."];
  }

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    errors.push("name is required and must be a non-empty string.");
  } else if (body.name.trim().length > 100) {
    errors.push("name must be 100 characters or fewer.");
  }

  if (
    body.payload !== undefined &&
    (typeof body.payload !== "object" ||
      body.payload === null ||
      Array.isArray(body.payload))
  ) {
    errors.push("payload must be a JSON object when provided.");
  }

  if (body.scheduledFor !== undefined) {
    const scheduledFor = new Date(body.scheduledFor);
    if (
      typeof body.scheduledFor !== "string" ||
      Number.isNaN(scheduledFor.getTime())
    ) {
      errors.push("scheduledFor must be a valid ISO date string.");
    }
  }

  return errors;
}

function createJobHandler(request, response) {
  const errors = validateCreateJob(request.body);
  if (errors.length > 0) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "The request body is invalid.",
        details: errors,
      },
    });
    return;
  }

  const job = createJob({
    name: request.body.name.trim(),
    payload: request.body.payload || {},
    scheduledFor: request.body.scheduledFor || new Date().toISOString(),
  });

  response.status(201).json({ data: job });
}

function listJobsHandler(_request, response) {
  response.json({ data: listJobs() });
}

function getJobHandler(request, response) {
  const job = findJob(request.params.id);
  if (!job) {
    response.status(404).json({
      error: {
        code: "JOB_NOT_FOUND",
        message: "The requested job does not exist.",
      },
    });
    return;
  }

  response.json({ data: job });
}

function deleteJobHandler(request, response) {
  if (!deleteJob(request.params.id)) {
    response.status(404).json({
      error: {
        code: "JOB_NOT_FOUND",
        message: "The requested job does not exist.",
      },
    });
    return;
  }

  response.status(204).send();
}

module.exports = {
  createJobHandler,
  listJobsHandler,
  getJobHandler,
  deleteJobHandler,
};
