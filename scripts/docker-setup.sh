#!/bin/bash
# Docker setup script - validates environment and starts containers

set -e

echo "🐳 Docker Setup Script"
echo "======================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "   Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker is installed: $(docker --version)"

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available"
    echo "   Please install Docker Compose v2"
    exit 1
fi

echo "✅ Docker Compose is available: $(docker compose version)"
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    echo "   Please create .env with required environment variables"
    echo "   See .env.example for reference"
    exit 1
fi

echo "✅ .env file found"

# # Create .env from .env (Docker Compose reads .env by default)
# if [ ! -f .env ]; then
#     echo "📝 Creating .env from .env..."
#     cp .env .env
#     echo "✅ .env file created"
# elif [ .env -nt .env ]; thesn
#     echo "📝 Updating .env from .env (newer)..."
#     cp .env .env
#     echo "✅ .env file updated"
# fi

echo ""

# Check required environment variables
required_vars=(
    "GEMINI_API_KEY"
    "PINECONE_API_KEY"
    "LIVEKIT_URL"
    "FIREBASE_ADMIN_PROJECT_ID"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "⚠️  Warning: Missing environment variables in .env:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ All required environment variables are set"
fi

echo ""
echo "📦 Building Docker images..."
docker compose build

echo ""
echo "🚀 Starting containers..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check frontend health
if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "⚠️  Frontend health check failed (may still be starting)"
fi

# Check agent container status
if docker compose ps agent | grep -q "Up"; then
    echo "✅ Agent is running"
else
    echo "❌ Agent failed to start"
    echo "   Check logs with: docker compose logs agent"
fi

echo ""
echo "================================"
echo "✅ Setup complete!"
echo ""
echo "Services:"
echo "  - Frontend: http://localhost:3000"
echo "  - Agent: Running (connects to LiveKit Cloud)"
echo ""
echo "Useful commands:"
echo "  - View logs: docker compose logs -f"
echo "  - Stop: docker compose down"
echo "  - Restart: docker compose restart"
echo "================================"
