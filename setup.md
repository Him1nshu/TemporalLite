# TemporalLite Setup and Frontend Flow

This guide explains how to run TemporalLite locally and how the Python Flask
frontend communicates with the Node.js API.

## Architecture

TemporalLite currently has three local services or layers:

```text
Browser
   |
   v
Python Flask frontend :5000
   |
   | HTTP requests
   v
Node.js Express API :3000
   |
   | PostgreSQL queries
   v
PostgreSQL :55432
```

The frontend does not connect directly to PostgreSQL. The Node.js API remains
the source of truth for job validation and persistence.

## Prerequisites

Install the following tools on Windows:

- Windows 10 or newer
- Python 3.10 or newer
- Node.js 20 or newer
- Docker Desktop with Docker Compose
- Git

## First-time setup

Open Command Prompt or PowerShell at the repository root:

```cmd
cd C:\Users\astng\Desktop\TemporalLite
```

### 1. Install and start the backend

The existing setup script installs Node dependencies, creates `.env` when it
does not exist, and starts PostgreSQL:

```cmd
setup.cmd
```

If the script has already been run, the equivalent manual commands are:

```cmd
npm install
copy .env.example .env
docker compose up -d postgres
```

Do not overwrite an existing `.env`; it may contain local credentials.

### 2. Start the Node.js API

Open a second terminal at the repository root:

```cmd
npm run dev
```

The API should be available at:

```text
http://localhost:3000
```

Check the health endpoint:

```cmd
curl http://localhost:3000/health
```

The API initializes the `jobs` table when it starts. PostgreSQL must be
running before the API can complete startup.

### 3. Create the Python frontend environment

Open a third terminal:

```cmd
cd C:\Users\astng\Desktop\TemporalLite\frontend
py -m venv .venv
.\.venv\Scripts\activate
python -m pip install -r requirements.txt
```

The frontend dependencies are:

- `Flask` for routes, templates, and development serving
- `requests` for calls to the Node.js API

### 4. Start the Python frontend

Keep the virtual environment activated:

```cmd
python app.py
```

Open the dashboard in a browser:

```text
http://127.0.0.1:5000
```

The API and frontend must both be running. The frontend displays an error
message when it cannot reach the API; it does not read the database directly.

## Configuration

The frontend reads these environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `TEMPORALLITE_API_URL` | `http://localhost:3000` | Base URL for the Node API |
| `TEMPORALLITE_API_TIMEOUT` | `5` | HTTP timeout in seconds |
| `FRONTEND_PORT` | `5000` | Flask development server port |
| `FLASK_SECRET_KEY` | Development fallback | Flask flash-message signing key |
| `FLASK_DEBUG` | Disabled | Set to `1` for Flask debug mode |

For example, to use an API on another port in PowerShell:

```powershell
$env:TEMPORALLITE_API_URL = "http://localhost:3001"
$env:FRONTEND_PORT = "5001"
python app.py
```

For anything beyond local development, provide a real secret through
`FLASK_SECRET_KEY` and do not use the development fallback.

## Frontend request flow

### Dashboard

1. The browser requests `GET /` from Flask.
2. [`dashboard`](C:/Users/astng/Desktop/TemporalLite/frontend/app.py:55) calls
   `api_request("GET", "/api/jobs")`.
3. [`api_request`](C:/Users/astng/Desktop/TemporalLite/frontend/app.py:26)
   sends an HTTP request to the Node API.
4. Express routes the request to `GET /api/jobs`.
5. The backend reads jobs from PostgreSQL and returns `{ "data": [...] }`.
6. Flask calculates the status summary and renders
   [`dashboard.html`](C:/Users/astng/Desktop/TemporalLite/frontend/templates/dashboard.html).

### Creating a job

1. The browser requests `GET /jobs/new`.
2. Flask renders [`job_form.html`](C:/Users/astng/Desktop/TemporalLite/frontend/templates/job_form.html).
3. The user submits a name, JSON object payload, and optional schedule.
4. Flask validates that the name exists and that the payload is a JSON object.
5. Flask sends `POST /api/jobs` to the Node API.
6. The Node controller performs its own validation and persists the job.
7. Flask redirects to `/jobs/<id>` and displays the newly created job.

Validation happens in both layers intentionally: the frontend provides quick
form feedback, while the backend protects the API for all clients.

### Viewing job details

1. The browser requests `/jobs/<id>`.
2. Flask sends `GET /api/jobs/<id>`.
3. The API loads the job by UUID.
4. Flask renders the status, metadata, and JSON payload in
   [`job_details.html`](C:/Users/astng/Desktop/TemporalLite/frontend/templates/job_details.html).

### Deleting a job

1. The user submits the delete form on the details page.
2. The browser sends `POST /jobs/<id>/delete` to Flask.
3. Flask sends `DELETE /api/jobs/<id>` to the Node API.
4. The API deletes the record from PostgreSQL.
5. Flask redirects to the dashboard and shows a success message.

## Error flow

The frontend handles two main API failure cases:

- If the API cannot be reached, `requests` raises an exception and Flask shows
  “The TemporalLite API is unavailable.”
- If the API returns an error response, Flask reads the API's error message and
  shows it as a flash message.

The frontend does not silently report failed create, view, or delete requests
as successful.

## Frontend routes

| Method | Frontend path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Dashboard and recent jobs |
| `GET` | `/jobs/new` | Create-job form |
| `POST` | `/jobs/new` | Validate and submit a job |
| `GET` | `/jobs/<id>` | Job details |
| `POST` | `/jobs/<id>/delete` | Delete a job |

## Stopping services

To stop the Flask frontend or Node API, press `Ctrl+C` in their terminals.

To stop PostgreSQL while keeping its data:

```cmd
docker compose stop postgres
```

To remove the PostgreSQL container while keeping its named volume:

```cmd
docker compose down
```

To remove the container and all locally persisted jobs:

```cmd
docker compose down -v
```

## Troubleshooting

### Frontend says the API is unavailable

Confirm that the API is running:

```cmd
curl http://localhost:3000/health
```

If the API uses another address, set `TEMPORALLITE_API_URL` before starting
Flask.

### API cannot connect to PostgreSQL

Check Docker and PostgreSQL:

```cmd
docker compose ps
docker compose logs postgres
```

Confirm that `.env` and `docker-compose.yml` use matching database settings.

### Port is already in use

Set `PORT` for the Node API or `FRONTEND_PORT` for Flask. If the API port
changes, also update `TEMPORALLITE_API_URL`.
