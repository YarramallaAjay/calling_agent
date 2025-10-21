#!/bin/bash

echo "🚀 Setting up Real Voice Agent..."

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8+"
    exit 1
fi

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add API keys to .env file:"
echo "   - GEMINI_API_KEY (https://aistudio.google.com/app/apikey)"
echo "   - DEEPGRAM_API_KEY (https://deepgram.com/)"
echo "   - OPENAI_API_KEY (https://platform.openai.com/api-keys)"
echo ""
echo "2. Start the agent:"
echo "   source venv/bin/activate"
echo "   python voice_agent.py dev"
echo ""
echo "3. Test in LiveKit Playground:"
echo "   https://agents-playground.livekit.io/"
echo ""
