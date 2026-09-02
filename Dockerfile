FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY pyproject.toml .
RUN pip install --no-cache-dir . uvicorn httpx

# Copy project code
COPY . .

# Expose port (default 8000, or Render dynamic $PORT)
EXPOSE 8000

# Start FastAPI which serves both API routes and frontend UI
CMD ["sh", "-c", "uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
