#!/bin/bash
# Seed knowledge base from within Docker container

set -e

echo "🌱 Seeding Knowledge Base (Docker)"
echo "===================================="
echo ""

# Check if frontend container is running
if ! docker compose ps frontend | grep -q "Up"; then
    echo "❌ Frontend container is not running"
    echo "   Start with: docker compose up -d"
    exit 1
fi

echo "📦 Running seed script in frontend container..."
docker compose exec frontend npx tsx scripts/seed-knowledge-base.ts

echo ""
echo "✅ Knowledge base seeding complete!"
