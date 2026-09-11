import os

# Gunicorn configuration file for production (Render / Cloud)

bind = "0.0.0.0:" + os.environ.get("PORT", "8000")

# Number of worker processes (defaults to 1 for Render Free/Starter tier)
workers = int(os.environ.get("WEB_CONCURRENCY", "1"))

# Use multi-threading so synchronous DB roundtrips don't block concurrent requests
threads = int(os.environ.get("GUNICORN_THREADS", "4"))
worker_class = "gthread"

# Set timeout to 120s (default 30s causes spurious SIGKILL when under load or WAN latency)
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "120"))

# Keepalive for reverse proxy connection reuse
keepalive = 5

# Restart workers periodically to prevent memory bloat on limited RAM plans
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
