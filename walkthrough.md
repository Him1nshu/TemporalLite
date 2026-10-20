# TemporalLite Walkthrough

## What is TemporalLite?

TemporalLite is the starting point for a distributed task scheduling
platform. Its long-term goal is to accept jobs from multiple clients, run
those jobs on worker nodes, schedule work for a future time, retry failed
attempts, and expose useful operational information.

The current implementation is intentionally smaller than that final vision.
It provides a working job-management application where users can:

- Create a job with a name, JSON payload, and optional scheduled time.
- View all stored jobs in a dashboard.
- Open a job to inspect its metadata and payload.
- Delete a job.
- Access the same job operations through a REST API.

Jobs are currently persisted with a `pending` status and an attempts counter.
There is not yet a scheduler or worker process that executes jobs, so creating
a job stores it for future processing rather than running it immediately.
Authentication, retries, and production observability are also not implemented
yet.

## High-level architecture

TemporalLite is made up of three layers:

```text
Browser
   |
   | HTML form requests
   v
Python Flask frontend :5000
   |
   | HTTP requests
   v
Node.js Express API :3000
   |
   | SQL queries
   v
PostgreSQL :55432
```

The frontend never connects directly to PostgreSQL. The Node.js API is the
single application layer responsible for API validation and database access.
This keeps the database boundary in one place and means other clients can use
the REST API without depending on the web interface.

## Request flow

### Viewing the dashboard

1. A browser requests `GET /` from the Flask frontend.
2. Flask calls the Node API with `GET /api/jobs`.
3. Express routes the request to the job controller.
4. The job store queries PostgreSQL and sorts jobs by creation time, newest
   first.
5. The API returns the jobs inside a `{ "data": [...] }` response.
6. Flask calculates the dashboard counts and renders
   `frontend/templates/dashboard.html`.

The dashboard displays total, pending, running, and completed counts. The
current backend creates jobs as `pending`; the other counts are present in the
frontend for the broader job lifecycle that the project is being built toward.

### Creating a job

1. The browser opens `GET /jobs/new`, and Flask renders the job form.
2. The user enters a name, a JSON object payload, and optionally a schedule.
3. Flask checks that the name is present and that the payload is valid JSON
   with an object as its root value.
4. Flask sends the data to `POST /api/jobs`.
5. The Express controller validates the request again. This second validation
   protects the API when it is called by clients other than the frontend.
6. The job store generates a UUID and inserts the job into PostgreSQL.
7. PostgreSQL supplies the default `pending` status and attempts value of `0`.
8. Flask redirects the browser to the job details page.

### Viewing and deleting a job

For a details page, Flask sends `GET /api/jobs/:id` to the API. The API looks
up the UUID, maps PostgreSQL column names to the JSON response shape, and
returns the job.

For deletion, the browser submits Flask's
`POST /jobs/:id/delete` route. Flask then calls `DELETE /api/jobs/:id` on the
API. If the job exists, the API returns `204 No Content` and Flask redirects
back to the dashboard.

## Technical stack

### Backend API: Node.js and Express

- **Node.js 20 or newer** runs the server-side JavaScript.
- **Express 5** provides the HTTP server, routing, JSON body parsing, and
  centralized error responses.
- **dotenv** loads local configuration from `.env`.
- **pg** provides the PostgreSQL connection pool and parameterized SQL queries.

The API is organized into small layers:

| Area | Location | Responsibility |
| --- | --- | --- |
| Application | `backend/src/app.js` | Creates the Express app, health endpoint, JSON parsing, 404 handling, and error handling |
| Startup | `backend/src/server.js` | Loads environment variables, initializes the database, and starts the API |
| Routes | `backend/src/routes/jobs.js` | Maps HTTP methods and paths to job handlers |
| Controllers | `backend/src/controllers/job-controller.js` | Validates requests and shapes HTTP responses |
| Store | `backend/src/store/job-store.js` | Executes PostgreSQL queries and maps database rows to API objects |
| Database | `backend/src/db.js` | Creates the connection pool and initializes the `jobs` table |

The API exposes:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Confirms that the API is running |
| `POST` | `/api/jobs` | Creates a job |
| `GET` | `/api/jobs` | Lists jobs, newest first |
| `GET` | `/api/jobs/:id` | Retrieves one job |
| `DELETE` | `/api/jobs/:id` | Deletes one job |

Successful API responses use a `data` property. Errors use an `error` object
with a stable error code, message, and, for validation failures, details.

### Database: PostgreSQL

PostgreSQL 16 runs locally through Docker Compose. The API creates the
`jobs` table automatically when it starts:

| Column | Meaning |
| --- | --- |
| `id` | UUID that uniquely identifies the job |
| `name` | Required job name, up to 100 characters |
| `payload` | JSONB object containing job-specific data |
| `status` | Current lifecycle state; new jobs start as `pending` |
| `attempts` | Number of execution attempts; starts at `0` |
| `scheduled_for` | Time at which the job is intended to be scheduled |
| `created_at` | Time at which the record was created |
| `updated_at` | Time at which the record was last updated |

The PostgreSQL data directory is stored in the named Docker volume
`temporallite-postgres-data`, so stopping the container does not remove local
jobs. Running `docker compose down -v` removes the volume and its data.

### Frontend: Python, Flask, and server-rendered HTML

- **Python 3.10 or newer** runs the web frontend.
- **Flask 3** provides routes, request handling, templates, redirects, and
  flash messages.
- **Requests** is the HTTP client used to call the Node API.
- **Jinja templates** render the dashboard, forms, and job details pages.
- **CSS** in `frontend/static/styles.css` supplies the visual design.

The frontend uses a small `api_request` helper to centralize calls to the
backend. It applies a timeout, turns connection failures into a user-facing
error, and displays messages returned by unsuccessful API responses.

### Local development and tooling

- **Docker Compose** runs PostgreSQL consistently on a local machine.
- **npm** installs JavaScript dependencies and runs the API.
- **Python virtual environments** isolate frontend dependencies.
- **Node's watch mode** (`npm run dev`) reloads the API during development.
- **Windows command scripts** (`setup.cmd`) automate initial setup.

## Configuration

The Node API reads these values from `.env`:

```dotenv
DATABASE_URL=******localhost:55432/temporallite
PORT=3000
POSTGRES_USER=temporallite
POSTGRES_PASSWORD=temporallite
POSTGRES_DB=temporallite
POSTGRES_PORT=55432
```

The `DATABASE_URL` value above is shown in the same redacted form as the
repository's example environment file. In a local `.env`, it must point to the
PostgreSQL instance configured by the other `POSTGRES_*` values.

The Flask frontend supports:

| Variable | Default | Purpose |
| --- | --- | --- |
| `TEMPORALLITE_API_URL` | `http://localhost:3000` | Node API base URL |
| `TEMPORALLITE_API_TIMEOUT` | `5` | API request timeout in seconds |
| `FRONTEND_PORT` | `5000` | Flask port |
| `FLASK_SECRET_KEY` | Development fallback | Signs Flask flash-message data |
| `FLASK_DEBUG` | Disabled | Enables Flask debug mode when set to `1` |

Use a real secret and disable debug mode outside local development.

## Running the application

From the repository root on Windows:

```cmd
setup.cmd
```

Start the API in a second terminal:

```cmd
npm run dev
```

Start the frontend in a third terminal:

```cmd
cd frontend
py -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
py app.py
```

Then open:

- Frontend dashboard: `http://127.0.0.1:5000`
- API health check: `http://localhost:3000/health`

## Current boundaries and future direction

TemporalLite currently proves the core path from a client request to durable
job storage. The next architectural pieces can build on that foundation:

1. A scheduler can select jobs whose `scheduled_for` time has arrived.
2. Workers can claim pending jobs and execute them.
3. Status transitions can represent running, completed, and failed work.
4. Retry policies can use the attempts counter to reschedule failures.
5. Authentication can protect job submission and administration.
6. Structured logs, metrics, and tracing can make distributed execution
   observable.

Until those pieces exist, the application should be understood as a
PostgreSQL-backed job registry and management dashboard, not yet as a complete
distributed execution system.
