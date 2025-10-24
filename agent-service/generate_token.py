#!/usr/bin/env python3
"""
Generate a LiveKit room token for testing the voice agent
This also creates the room with agent dispatch enabled
"""
import os
import asyncio
from dotenv import load_dotenv
from livekit import api

load_dotenv()

async def create_room_with_agent():
    """Create a room and dispatch the agent to it"""

    # Create LiveKit API client
    livekit_api = api.LiveKitAPI(
        url=os.getenv("LIVEKIT_URL"),
        api_key=os.getenv("LIVEKIT_API_KEY"),
        api_secret=os.getenv("LIVEKIT_API_SECRET"),
    )

    room_name = "Second_room"

    try:
        # Create room
        print("Creating room...")
        room = await livekit_api.room.create_room(
            api.CreateRoomRequest(
                name=room_name,
                empty_timeout=300,  # 5 minutes
                max_participants=10,
            )
        )
        print(f"[SUCCESS] Room created: {room.name}")
    except Exception as e:
        if "already exists" in str(e):
            print(f"[INFO] Room already exists: {room_name}")
        else:
            print(f"[ERROR] Error creating room: {e}")

    # Dispatch agent to the room
    try:
        print("Dispatching agent to room...")
        dispatch_result = await livekit_api.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                room=room_name,
                agent_name="",  # Empty = any available agent
            )
        )
        print(f"[SUCCESS] Agent dispatched successfully!")
        print(f"   Dispatch ID: {dispatch_result.agent_dispatch.id}")
    except Exception as e:
        print(f"[WARNING] Agent dispatch error: {e}")
        print(f"   This is OK if agent already dispatched or auto-joining")

    # Create a token for a test participant
    token = api.AccessToken(
        api_key=os.getenv("LIVEKIT_API_KEY"),
        api_secret=os.getenv("LIVEKIT_API_SECRET"),
    )

    # Set token details
    identity = "Srinivas"
    token.with_identity(identity)  # Your identity in the room
    token.with_name("Srinivas")      # Display name
    token.with_grants(api.VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_subscribe=True,
    ))

    # Generate the token (valid for 6 hours)
    jwt_token = token.to_jwt()

    print("\n" + "="*60)
    print("LiveKit Room Token Generated!")
    print("="*60)
    print(f"\nRoom: {room_name}")
    print(f"Identity: {identity}")
    print(f"\nToken:\n{jwt_token}")
    print("\n" + "="*60)
    print("\nHow to use:")
    print("1. Open: http://localhost:3000/test-agent.html")
    print("2. Paste this token in the 'Token' field")
    print("3. Click 'Connect to Agent'")
    print("4. Allow microphone and start talking!")
    print("\nThe agent will greet you automatically")
    print("="*60 + "\n")

    await livekit_api.aclose()

if __name__ == "__main__":
    asyncio.run(create_room_with_agent())
