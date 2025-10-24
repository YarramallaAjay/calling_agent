# Simple Python Agent Dockerfile for MVP
FROM python:3.11-slim

WORKDIR /code

# Install system dependencies needed for building Python packages
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files
COPY *.py .

# The agent connects to LiveKit via WebRTC
EXPOSE 8080

# Start the voice agent
CMD ["python", "voice_agent.py", "start"]
