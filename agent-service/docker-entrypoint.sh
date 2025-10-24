#!/bin/bash
# Entrypoint script for agent container
# Handles initialization and graceful startup

set -e

echo "🚀 Starting AI Agent Service..."
echo "================================"

# Print environment info (without secrets)
echo "Environment:"
echo "  - LIVEKIT_URL: ${LIVEKIT_URL:-not set}"
echo "  - API_URL: ${NEXT_PUBLIC_APP_URL:-not set}"
echo "  - KB Enabled: $([ -n "$PINECONE_API_KEY" ] && echo 'Yes' || echo 'No')"
echo ""

# Wait for API to be ready
if [ -n "$NEXT_PUBLIC_APP_URL" ]; then
    echo "⏳ Waiting for dashboard API to be ready..."
    MAX_RETRIES=30
    RETRY_COUNT=0

    until curl -f -s "${NEXT_PUBLIC_APP_URL}/api/help-requests/pending" > /dev/null 2>&1 || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
        RETRY_COUNT=$((RETRY_COUNT+1))
        echo "   Attempt $RETRY_COUNT/$MAX_RETRIES..."
        sleep 2
    done

    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo "⚠️  Warning: Could not reach dashboard API"
        echo "   Agent will start but escalations may not work"
    else
        echo "✅ Dashboard API is ready"
    fi
fi

echo ""
echo "✅ Initialization complete"
echo "================================"
echo ""

# Execute the main command
exec "$@"
