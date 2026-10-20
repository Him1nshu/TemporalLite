# TemporalLite

TemporalLite is a Node.js distributed task scheduling platform. The project is
being built incrementally to accept jobs from multiple clients, schedule them
for execution, distribute work across worker nodes, and provide reliable
retries and observability.

## Current status

The current slice provides an Express REST API with PostgreSQL-backed job
persistence:

- The API exposes health and CRUD endpoints for jobs.
- PostgreSQL is started locally with Docker Compose.
- The `jobs` table is created automatically when the API starts.
- Job payloads are stored as JSONB.
- Jobs currently have a `pending` status and an attempts counter.
- Worker execution, scheduling, retries, authentication, and observability are
  not implemented yet.

## Prerequisites

- Windows 10 or newer
- Node.js 20 or newer
- Docker Desktop with Docker Compose
- Git

## Quick start on Windows

From the repository root, run:

```cmd
setup.cmd
```

The setup script:

1. Verifies that Node.js, npm, and Docker Compose are available.
2. Installs the Node.js dependencies.
3. Creates `.env` from `.env.example` if `.env` does not exist.
4. Starts the PostgreSQL container in the background.

Start the API in a second terminal:

```cmd
npm run dev
```

The API is available at `http://localhost:3000`.

Start the Python frontend in another terminal:

```cmd
cd frontend
py -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
py app.py
```

The frontend is available at `http://127.0.0.1:5000`. It calls the Node API
over HTTP. Set `TEMPORALLITE_API_URL` if the API is running at a different
address, and set `FRONTEND_PORT` to change the frontend port.

For the complete setup and frontend request flow, see
[`setup.md`](setup.md).

For a clear explanation of the application, architecture, and technical stack,
see [`walkthrough.md`](walkthrough.md).

To run without file watching:

```cmd
npm start
```

## Manual setup

If you do not want to use `setup.cmd`:

```cmd
npm install
copy .env.example .env
docker compose up -d postgres
npm run dev
```

Do not overwrite an existing `.env`; it may contain local credentials or
configuration. The file is ignored by Git. Update `.env.example` when a new
required environment variable is introduced.

## Configuration

The default `.env` values are:

```dotenv
DATABASE_URL=postgres://temporallite:temporallite@localhost:55432/temporallite
PORT=3000
POSTGRES_USER=temporallite
POSTGRES_PASSWORD=temporallite
POSTGRES_DB=temporallite
POSTGRES_PORT=55432
```

`DATABASE_URL` must point to the PostgreSQL instance used by the API. `PORT`
must be an integer between 1 and 65535. The `POSTGRES_*` settings configure
the local Docker Compose database and must match the credentials and host port
used by `DATABASE_URL`.

## Database

Docker Compose runs PostgreSQL 16 with these local development settings:

- Host: `localhost`
- Port: `55432`
- Database: `temporallite`
- User: `temporallite`
- Password: `temporallite`

The database data is stored in the named Docker volume
`temporallite-postgres-data`, so restarting the container does not remove jobs.
Compose exposes a healthcheck for PostgreSQL readiness. If credentials are
changed after the volume has been created, update the existing database
credentials or recreate the local volume; changing environment variables alone
does not alter an initialized PostgreSQL data directory.
To stop the database without deleting its data:

```cmd
docker compose stop postgres
```

To stop and remove the container while keeping the named volume:

```cmd
docker compose down
```

To remove the database and all locally persisted jobs:

```cmd
docker compose down -v
```

## API endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Returns API health and timestamp |
| `POST` | `/api/jobs` | Creates a job |
| `GET` | `/api/jobs` | Lists jobs, newest first |
| `GET` | `/api/jobs/:id` | Retrieves a job by UUID |
| `DELETE` | `/api/jobs/:id` | Deletes a job |

Create a job from Windows Command Prompt:

```cmd
curl -X POST http://localhost:3000/api/jobs ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"send-email\",\"payload\":{\"to\":\"user@example.com\"}}"
```

Example response:

```json
{
  "data": {
    "id": "7d6f4df2-4b4e-4a57-9e46-4b7a9edc5a4a",
    "name": "send-email",
    "payload": {
      "to": "user@example.com"
    },
    "status": "pending",
    "attempts": 0,
    "scheduledFor": "2026-01-01T00:00:00.000Z",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

`name` is required and must be a non-empty string of at most 100 characters.
`payload`, when supplied, must be a JSON object. `scheduledFor`, when supplied,
must be a valid date string.

## Project structure

```text
backend/src/
  app.js                         Express app and error handling
  server.js                      Environment loading and server startup
  db.js                          PostgreSQL pool and schema initialization
  controllers/job-controller.js  Job validation and HTTP handlers
  routes/jobs.js                 Job route definitions
  store/job-store.js             PostgreSQL job queries and response mapping
frontend/
  app.py                         Flask frontend and API client
  templates/                     Server-rendered dashboard pages
  static/styles.css              Frontend styles
docker-compose.yml               Local PostgreSQL service
setup.cmd                        Windows setup script
```

## Development commands

```cmd
npm run dev
npm start
docker compose logs -f postgres
docker compose ps
```

There are currently no automated test scripts in `package.json`. Before
submitting changes, verify the health endpoint and exercise the job CRUD
endpoints against a running PostgreSQL container.

## Troubleshooting

### Docker is not running

Start Docker Desktop, then run:

```cmd
docker compose up -d postgres
```

### The API cannot connect to PostgreSQL

Check the container and logs:

```cmd
docker compose ps
docker compose logs postgres
```

Confirm that `.env` contains the same host, port, database, user, and password
as `docker-compose.yml`.

### Port 3000 or 55432 is already in use

Change `PORT` in `.env` for the API. Change the host-side port mapping in
`docker-compose.yml` and update `DATABASE_URL` in `.env` if PostgreSQL's host
port is unavailable.

## License

This project currently uses the ISC license declared in `package.json`.
