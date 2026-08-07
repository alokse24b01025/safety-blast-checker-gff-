FROM python:3.11-slim

WORKDIR /app

# Prevent python from writing pyc files to disc and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose container port
EXPOSE 8000

# Start command using environment PORT
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
