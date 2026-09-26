# Multi-stage production-ready Dockerfile for ReviveAI
# Stage 1: Build dependencies
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
# Install wheel and build dependencies into a virtual environment or isolated prefix
RUN pip install --no-cache-dir --user . uvicorn httpx

# Stage 2: Minimal Runtime Image
FROM python:3.12-slim AS runtime

# Security: Run as non-root user
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/bash -m appuser

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/home/appuser/.local/bin:$PATH" \
    PORT=8000

# Copy installed wheels and dependencies from builder to appuser
COPY --from=builder /root/.local /home/appuser/.local

# Copy application source code
COPY --chown=appuser:appgroup . /app

# Ensure correct permissions
RUN chown -R appuser:appgroup /app /home/appuser

USER appuser

EXPOSE 8000

# Built-in health check using standard python urllib (no curl required)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request, os; port = os.environ.get('PORT', 8000); urllib.request.urlopen(f'http://localhost:{port}/health')" || exit 1

CMD ["sh", "-c", "uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
