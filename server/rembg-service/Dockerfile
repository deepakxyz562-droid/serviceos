FROM python:3.10-slim

# Install system dependencies required for OpenCV / Pillow / ONNX
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy microservice code
COPY rembg_service.py .

EXPOSE 8008

# Run with Uvicorn
CMD ["uvicorn", "rembg_service:app", "--host", "0.0.0.0", "--port", "8008"]
