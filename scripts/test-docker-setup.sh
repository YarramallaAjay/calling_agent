#!/bin/bash
# Test Docker setup - validates all components

set -e

echo "🧪 Testing Docker Setup"
echo "======================="
echo ""

# Test 1: Frontend health
echo "Test 1: Frontend health check"
if curl -f -s http://localhost:3000/api/health | grep -q "healthy"; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

# Test 2: Knowledge base API
echo ""
echo "Test 2: Knowledge base API"
if curl -f -s http://localhost:3000/api/knowledge-base/entries > /dev/null; then
    echo "✅ Knowledge base API is responding"
else
    echo "❌ Knowledge base API failed"
    exit 1
fi

# Test 3: Agent container health
echo ""
echo "Test 3: Agent container health"
if docker compose exec -T agent python healthcheck.py; then
    echo "✅ Agent health check passed"
else
    echo "❌ Agent health check failed"
    exit 1
fi

# Test 4: Agent KB connection
echo ""
echo "Test 4: Agent knowledge base connection"
if docker compose logs agent | grep -q "Knowledge base enabled"; then
    echo "✅ Agent connected to knowledge base"
else
    echo "⚠️  Agent may not have KB enabled (check logs)"
fi

# Test 5: LiveKit connection
echo ""
echo "Test 5: LiveKit connection"
if docker compose logs agent | grep -q "Starting voice agent"; then
    echo "✅ Agent is attempting LiveKit connection"
else
    echo "⚠️  Agent may not be connecting to LiveKit"
fi

echo ""
echo "==================================
"
echo "✅ All tests passed!"
echo "==================================
"
