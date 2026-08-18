FROM python:3.10-slim

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies in separate layers to keep temporary download buffer low
RUN pip install --no-cache-dir flask flask-cors requests pillow "numpy<2"
RUN pip install --no-cache-dir opencv-python-headless
RUN pip install --no-cache-dir onnxruntime
RUN pip install --no-cache-dir --no-deps insightface

# Create directories for models and registered images
RUN mkdir -p /root/.insightface/models
RUN mkdir -p /app/known_faces

# Copy source code
COPY app.py .

EXPOSE 5002

CMD ["python", "app.py"]
