#!/usr/bin/env python3
"""
Generate a LiveKit room token for testing the voice agent
"""
import os
from dotenv import load_dotenv
from livekit import api

load_dotenv()

# Create a token for a test participant
token = api.AccessToken(
    api_key=os.getenv("LIVEKIT_API_KEY"),
    api_secret=os.getenv("LIVEKIT_API_SECRET"),
)

# Set token details
token.with_identity("test-user")  # Your identity in the room
token.with_name("Test User")      # Display name
token.with_grants(api.VideoGrants(
    room_join=True,
    room="test-room",  # Room name
    can_publish=True,
    can_subscribe=True,
))

# Generate the token (valid for 6 hours)
jwt_token = token.to_jwt()

print("\n" + "="*60)
print("🎫 LiveKit Room Token Generated!")
print("="*60)
print(f"\nRoom: test-room")
print(f"Identity: test-user")
print(f"\nToken:\n{jwt_token}")
print("\n" + "="*60)
print("\n📝 How to use:")
print("1. Open: https://agents-playground.livekit.io/")
print("2. Paste this token in the 'Token' field")
print("3. Click 'Connect'")
print("4. Start talking to the voice agent!")
print("="*60 + "\n")
