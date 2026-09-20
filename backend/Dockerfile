FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (Tesseract for OCR)
# We don't need libgl1-mesa-glx because we are using opencv-python-headless
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU first (keeps image size small and avoids GPU overhead)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install remaining packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend directory
COPY . .

# Expose port
EXPOSE 8000

# Start FastAPI using Uvicorn
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port "]
