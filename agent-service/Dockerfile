# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
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
COPY voice_agent.py .
COPY dispatch_agent.py .
COPY generate_token.py .

# The agent doesn't expose HTTP ports, it connects to LiveKit via WebRTC
# But we expose 8080 for health checks if needed
EXPOSE 8080

# Start the voice agent in production mode
# This uses the livekit.agents CLI that's installed via requirements.txt
CMD ["python", "voice_agent.py", "start"]
