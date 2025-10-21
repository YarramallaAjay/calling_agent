#!/bin/bash

echo "🚀 Installing Voice Agent Dependencies Step-by-Step"
echo "This avoids dependency resolution issues"
echo ""

# Activate virtual environment
source venv/bin/activate

# Install in order to avoid conflicts
echo "📦 Step 1: Core dependencies..."
pip install --upgrade pip
pip install python-dotenv==1.0.1
pip install aiohttp==3.10.11

echo ""
echo "📦 Step 2: Installing all packages..."
pip install livekit-agents
pip install livekit-plugins-silero
pip install livekit-plugins-deepgram
pip install livekit-plugins-google

echo ""
echo "✅ All dependencies installed!"
echo ""
echo "Test with: python voice_agent.py dev"
