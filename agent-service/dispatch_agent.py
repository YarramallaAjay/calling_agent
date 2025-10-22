#!/usr/bin/env python3
"""
Dispatch an agent to a room manually
This ensures the agent joins when you connect
"""
import os
import asyncio
from dotenv import load_dotenv
from livekit import api

load_dotenv()

async def dispatch_agent_to_room():
    """Dispatch the agent to first_room"""

    livekit_api = api.LiveKitAPI(
        url=os.getenv("LIVEKIT_URL"),
        api_key=os.getenv("LIVEKIT_API_KEY"),
        api_secret=os.getenv("LIVEKIT_API_SECRET"),
    )

    room_name = "first_room"

    try:
        # Create or update room with agent dispatch
        print(f"Dispatching agent to room: {room_name}")

        # Create agent dispatch
        result = await livekit_api.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                room=room_name,
                agent_name="",  # Empty means use any available agent
            )
        )

        print(f"Agent dispatch created!")
        print(f"   Dispatch ID: {result.agent_dispatch.id}")
        print(f"   Room: {result.agent_dispatch.room}")

    except Exception as e:
        print(f"Error dispatching agent: {e}")
        print(f"\nThis might mean:")
        print(f"   1. Agent dispatch is already active for this room")
        print(f"   2. Or automatic dispatch is enabled in LiveKit Cloud console")

    await livekit_api.aclose()

if __name__ == "__main__":
    asyncio.run(dispatch_agent_to_room())
