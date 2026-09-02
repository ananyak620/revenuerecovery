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

# Expose ports: 8000 for FastAPI, 3000 for Frontend
EXPOSE 8000 3000

# Start script running backend and frontend concurrently
CMD ["sh", "-c", "uvicorn src.api.main:app --host 0.0.0.0 --port 8000 & python -m http.server 3000"]
