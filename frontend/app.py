import json
import os
from datetime import datetime
from typing import Any

import requests
from flask import Flask, flash, redirect, render_template, request, url_for


app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY", "temporallite-development-key")

API_BASE_URL = os.environ.get("TEMPORALLITE_API_URL", "http://localhost:3000").rstrip("/")
API_TIMEOUT_SECONDS = float(os.environ.get("TEMPORALLITE_API_TIMEOUT", "5"))


class ApiError(Exception):
    """Raised when the backend API cannot complete a frontend request."""

    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


def api_request(method: str, path: str, **kwargs: Any) -> Any:
    try:
        response = requests.request(
            method,
            f"{API_BASE_URL}{path}",
            timeout=API_TIMEOUT_SECONDS,
            **kwargs,
        )
    except requests.RequestException as error:
        raise ApiError(
            "The TemporalLite API is unavailable. Start the API and try again."
        ) from error

    if not response.ok:
        try:
            details = response.json().get("error", {})
            message = details.get("message", "The API request failed.")
        except ValueError:
            message = "The API request failed."
        raise ApiError(message, response.status_code)

    if response.status_code == 204:
        return None
    return response.json().get("data")


def format_datetime(value: str) -> str:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return value
    return parsed.strftime("%b %d, %Y at %H:%M UTC")


app.jinja_env.filters["datetime"] = format_datetime


@app.get("/")
def dashboard():
    try:
        jobs = api_request("GET", "/api/jobs")
    except ApiError as error:
        flash(str(error), "error")
        jobs = []

    status_counts = {
        "total": len(jobs),
        "pending": sum(job["status"] == "pending" for job in jobs),
        "running": sum(job["status"] == "running" for job in jobs),
        "completed": sum(job["status"] == "completed" for job in jobs),
    }
    return render_template("dashboard.html", jobs=jobs, status_counts=status_counts)


@app.route("/jobs/new", methods=["GET", "POST"])
def create_job():
    if request.method == "GET":
        return render_template("job_form.html")

    name = request.form.get("name", "").strip()
    payload_text = request.form.get("payload", "{}").strip() or "{}"
    scheduled_for = request.form.get("scheduled_for", "").strip()

    if not name:
        flash("A job name is required.", "error")
        return render_template("job_form.html", name=name, payload=payload_text), 400

    try:
        payload = json.loads(payload_text)
    except json.JSONDecodeError:
        flash("Payload must contain valid JSON.", "error")
        return render_template("job_form.html", name=name, payload=payload_text), 400

    if not isinstance(payload, dict):
        flash("Payload must be a JSON object.", "error")
        return render_template("job_form.html", name=name, payload=payload_text), 400

    body: dict[str, Any] = {"name": name, "payload": payload}
    if scheduled_for:
        body["scheduledFor"] = scheduled_for

    try:
        job = api_request("POST", "/api/jobs", json=body)
    except ApiError as error:
        flash(str(error), "error")
        return render_template("job_form.html", name=name, payload=payload_text), 400

    flash(f'Job "{job["name"]}" was created.', "success")
    return redirect(url_for("job_details", job_id=job["id"]))


@app.get("/jobs/<job_id>")
def job_details(job_id: str):
    try:
        job = api_request("GET", f"/api/jobs/{job_id}")
    except ApiError as error:
        flash(str(error), "error")
        return redirect(url_for("dashboard"))
    return render_template("job_details.html", job=job)


@app.post("/jobs/<job_id>/delete")
def delete_job(job_id: str):
    try:
        api_request("DELETE", f"/api/jobs/{job_id}")
    except ApiError as error:
        flash(str(error), "error")
        return redirect(url_for("job_details", job_id=job_id))

    flash("Job deleted.", "success")
    return redirect(url_for("dashboard"))


if __name__ == "__main__":
    port = int(os.environ.get("FRONTEND_PORT", "5000"))
    app.run(host="127.0.0.1", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
