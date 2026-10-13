const { randomUUID } = require("node:crypto");
const { pool } = require("../db");

function mapJob(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    payload: row.payload,
    status: row.status,
    attempts: row.attempts,
    scheduledFor: row.scheduled_for.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function createJob({ name, payload, scheduledFor }) {
  const result = await pool.query(
    `INSERT INTO jobs (id, name, payload, scheduled_for)
     VALUES ($1, $2, $3::jsonb, $4)
     RETURNING *`,
    [randomUUID(), name, JSON.stringify(payload), scheduledFor],
  );

  return mapJob(result.rows[0]);
}

async function listJobs() {
  const result = await pool.query("SELECT * FROM jobs ORDER BY created_at DESC");
  return result.rows.map(mapJob);
}

async function findJob(id) {
  const result = await pool.query("SELECT * FROM jobs WHERE id = $1", [id]);
  return mapJob(result.rows[0]);
}

async function deleteJob(id) {
  const result = await pool.query("DELETE FROM jobs WHERE id = $1", [id]);
  return result.rowCount > 0;
}

module.exports = { createJob, listJobs, findJob, deleteJob };
