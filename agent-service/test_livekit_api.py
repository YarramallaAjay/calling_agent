#!/usr/bin/env python3
"""
Test script to verify LiveKit Agents API usage
"""
import os
from dotenv import load_dotenv
from livekit.agents import llm
from livekit.plugins import google

load_dotenv()

print("Testing LiveKit Agents API...")
print("=" * 60)

# Test 1: ChatContent creation
print("\n1. Testing ChatContent creation:")
try:
    content = llm.ChatContent(text="Hello, this is a test")
    print(f"✅ ChatContent created: {content}")
except Exception as e:
    print(f"❌ ChatContent error: {e}")

# Test 2: ChatMessage creation
print("\n2. Testing ChatMessage creation:")
try:
    message = llm.ChatMessage(
        role="system",
        content=[llm.ChatContent(text="You are a helpful assistant")]
    )
    print(f"✅ ChatMessage created with role: {message.role}")
except Exception as e:
    print(f"❌ ChatMessage error: {e}")

# Test 3: ChatContext creation
print("\n3. Testing ChatContext creation:")
try:
    ctx = llm.ChatContext(
        items=[
            llm.ChatMessage(
                role="system",
                content=[llm.ChatContent(text="System prompt here")]
            )
        ]
    )
    print(f"✅ ChatContext created with {len(ctx.items)} items")
except Exception as e:
    print(f"❌ ChatContext error: {e}")

# Test 4: Google TTS initialization
print("\n4. Testing Google TTS initialization:")
try:
    tts = google.TTS(
        language="en-US",
        gender="female",
        voice_name="en-US-Neural2-F"
    )
    print(f"✅ Google TTS initialized")
except Exception as e:
    print(f"❌ Google TTS error: {e}")

# Test 5: Google LLM initialization
print("\n5. Testing Google LLM initialization:")
try:
    llm_instance = google.LLM(
        model="gemini-1.5-flash",
        api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0.7
    )
    print(f"✅ Google LLM initialized")
except Exception as e:
    print(f"❌ Google LLM error: {e}")

print("\n" + "=" * 60)
print("API Test Complete!")
