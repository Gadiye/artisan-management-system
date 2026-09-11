# Use an official Python runtime as a parent image
FROM python:3.11-slim-bookworm

# Set the working directory in the container
WORKDIR /app/backend

# Install system dependencies needed for Python packages (if any, e.g., for psycopg2)
# Uncomment and adjust if your requirements.txt needs specific system libraries
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     libpq-dev gcc \
#     && rm -rf /var/lib/apt/lists/*

# Copy the requirements file and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your backend application code
COPY . .

# Expose the port your Django application will run on (e.g., 8000 for Django/Gunicorn)
EXPOSE 8000

# Production: use Gunicorn with gunicorn.conf.py
CMD ["gunicorn", "--config", "gunicorn.conf.py", "appback.wsgi:application"]

