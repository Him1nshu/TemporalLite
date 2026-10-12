const { randomUUID } = require("node:crypto");

const jobs = new Map();

function createJob({ name, payload, scheduledFor }) {
  const now = new Date().toISOString();
  const job = {
    id: randomUUID(),
    name,
    payload,
    status: "pending",
    attempts: 0,
    scheduledFor,
    createdAt: now,
    updatedAt: now,
  };

  jobs.set(job.id, job);
  return job;
}

function listJobs() {
  return [...jobs.values()].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

function findJob(id) {
  return jobs.get(id) || null;
}

function deleteJob(id) {
  return jobs.delete(id);
}

module.exports = { createJob, listJobs, findJob, deleteJob };
