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

    room_name = "test-room"

    try:
        # Create room with agent dispatch
        print("Creating room with agent dispatch...")
        room = await livekit_api.room.create_room(
            api.CreateRoomRequest(
                name=room_name,
                empty_timeout=300,  # 5 minutes
                max_participants=10,
            )
        )
        print(f"Room created: {room.name}")
    except Exception as e:
        if "already exists" in str(e):
            print(f"Room already exists: {room_name}")
        else:
            print(f"Error creating room: {e}")

    # Create a token for a test participant
    token = api.AccessToken(
        api_key=os.getenv("LIVEKIT_API_KEY"),
        api_secret=os.getenv("LIVEKIT_API_SECRET"),
    )

    # Set token details
    identity = "test-user"
    token.with_identity(identity)  # Your identity in the room
    token.with_name("Test User")      # Display name
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
