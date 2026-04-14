FROM python:3.12-slim

WORKDIR /app

# Copy backend and database folders
COPY backend/ ./backend/
COPY database/ ./database/

# Set working directory to backend
WORKDIR /app/backend

# Install dependencies
RUN pip install --no-cache-dir fastapi uvicorn sqlalchemy python-multipart

# Expose port
EXPOSE 8000

# Run the backend
CMD ["python", "main.py"]