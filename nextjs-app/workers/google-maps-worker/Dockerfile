# Multi-stage Build für optimierte Image-Größe
FROM python:3.11-slim as builder

# Set working directory
WORKDIR /app

# Install system dependencies für lxml und andere Packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libxml2-dev \
    libxslt-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (für besseres Caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# Final stage - kleineres Image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY . .

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Environment Variables (werden von Railway/Docker gesetzt)
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Health Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Expose port
EXPOSE 8000

# Run the API server
CMD ["python", "api.py"]

