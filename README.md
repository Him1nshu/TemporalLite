# TemporalLite

TemporalLite is a JavaScript/Node.js distributed task scheduling platform. It is
designed to accept jobs from multiple clients, schedule them for execution,
distribute work across worker nodes, and provide reliable retries and
observability.

## Current backend

The first backend slice is an Express REST API with an in-memory job store.
Data is intentionally reset when the process stops; persistent storage and
workers will be added in later slices.

```bash
npm install
npm start
```

The server listens on `http://localhost:3000` by default. Set `PORT` to use a
different port.

### Endpoints

- `GET /health` - API health check
- `POST /api/jobs` - create a job
- `GET /api/jobs` - list jobs
- `GET /api/jobs/:id` - retrieve a job
- `DELETE /api/jobs/:id` - delete a job

Create a job:

```bash
curl -X POST http://localhost:3000/api/jobs ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"send-email\",\"payload\":{\"to\":\"user@example.com\"}}"
```