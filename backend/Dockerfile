FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (Tesseract for OCR)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU first
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install remaining packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend directory
COPY . .

# Expose port
EXPOSE 8000

# Start FastAPI using Uvicorn on a fixed port (Render automatically detects the EXPOSE instruction)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
