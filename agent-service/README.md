# LiveKit Voice Agent (Node.js/TypeScript)

A **real voice agent** that handles phone calls using LiveKit + Google Gemini, built with Node.js/TypeScript.

## Features

- ✅ **Node.js/TypeScript** implementation
- ✅ **Escalate to Supervisor** function with conversation context
- ✅ **LiveKit Room** integration
- ✅ **Conversation tracking** for escalations
- ⚠️ **Voice Pipeline** (STT/TTS) requires additional setup

## Quick Start

### 1. Install Dependencies

```bash
cd agent-service
bun install
```

### 2. Configure Environment

The `.env` file is already set up with your LiveKit credentials. Just add your Gemini API key:

```bash
# Edit .env and add:
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your Gemini API key from: https://aistudio.google.com/app/apikey

### 3. Make Sure Next.js App is Running

The agent needs the Next.js app to create help requests:

```bash
# In the main project directory
cd ..
bun dev
```

### 4. Run the Agent

```bash
# In agent-service directory
bun dev
```

## What You'll See

The agent will:
1. Connect to LiveKit
2. Show configuration
3. Demonstrate the escalation function
4. Create a test help request

Output:
```
🚀 Starting LiveKit Voice Agent...
📋 Configuration:
  LiveKit URL: wss://calling-agent-ih8g5t00.livekit.cloud
  API URL: http://localhost:3000
  Gemini API Key: ✓ Set

📞 Agent is ready to receive calls

🧪 Testing escalation function...

👤 Caller: Hi, I'm looking for some information
🤖 Agent: Hello! Welcome to Luxe Beauty Salon...
👤 Caller: Do you have parking available?

🚨 ESCALATING TO SUPERVISOR 🚨
==================================================
Question: Do you have parking available?
Caller: Test User
Phone: +1234567890
Conversation Context:
Caller: Hi, I'm looking for some information
Agent: Hello! Welcome to Luxe Beauty Salon...
Caller: Do you have parking available?
==================================================
✅ Help request created: abc123def456

📤 Escalation result: I've sent your question to my supervisor...
```

Then check your supervisor dashboard at http://localhost:3000/dashboard to see the request!

## Full Voice Implementation (Next Steps)

The current implementation has the core escalation logic working. For **full voice capabilities** (STT/TTS), you have two options:

### Option 1: Use Python SDK (Recommended for Voice)

The LiveKit Python SDK has built-in voice pipeline with STT/TTS:

```bash
# Create Python environment
python3 -m venv venv
source venv/bin/activate
pip install livekit-agents livekit-plugins-google livekit-plugins-silero

# Run Python agent (full voice support)
python agent.py dev
```

### Option 2: Add STT/TTS to Node.js

Integrate with external services:

**Speech-to-Text:**
- Deepgram (`@deepgram/sdk`)
- Google Cloud Speech
- AssemblyAI

**Text-to-Speech:**
- ElevenLabs (`elevenlabs-node`)
- Google Cloud TTS
- Play.ht

Example with Deepgram + ElevenLabs:
```bash
bun add @deepgram/sdk elevenlabs-node
```

## How the Escalation Works

1. **Caller asks question** the agent doesn't know
2. **Agent detects** it needs help (via Gemini)
3. **Calls `escalateToSupervisor()`** function with:
   - Question
   - Caller name/phone
   - Full conversation context
4. **Creates help request** via API
5. **Appears in dashboard** instantly (real-time)
6. **Supervisor responds** via UI
7. **Follow-up sent** to caller

## Conversation Context Tracking

The agent tracks every message:

```typescript
conversationTracker.addMessage('user', 'Do you have parking?');
conversationTracker.addMessage('assistant', 'Let me check...');

// When escalating, includes last 10 messages
const context = conversationTracker.getContext();
// Output:
// Caller: Hi, I'm looking for information
// Agent: Hello! How can I help?
// Caller: Do you have parking?
```

This context is sent to the supervisor so they understand the full conversation.

## Testing with LiveKit Playground

1. Start the agent: `bun dev`
2. Go to: https://agents-playground.livekit.io/
3. Enter your LiveKit URL: `wss://calling-agent-ih8g5t00.livekit.cloud`
4. Click "Connect"
5. Start talking!

(Note: For full voice, you'll need STT/TTS integration)

## Project Structure

```
agent-service/
├── agent.ts              # Main voice agent
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── .env                  # Environment variables
└── README.md            # This file
```

## Environment Variables

```bash
# LiveKit (already configured)
LIVEKIT_URL=wss://calling-agent-ih8g5t00.livekit.cloud
LIVEKIT_API_KEY=APIux7RgAu6u67S
LIVEKIT_API_SECRET=NoUfb3UDJ1ZdUCJriiqNkKsIwT13sBR9aHhcKX1fGQT

# Gemini API (ADD THIS)
GEMINI_API_KEY=your_key_here

# Next.js App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Available Commands

```bash
bun dev      # Run in watch mode (auto-reload)
bun start    # Run once
bun build    # Build TypeScript
```

## Troubleshooting

### Agent not creating help requests?
- Make sure Next.js app is running on port 3000
- Check `NEXT_PUBLIC_APP_URL` in `.env`
- Verify Gemini API key is set

### Want full voice capabilities?
- Use the Python SDK (recommended)
- Or integrate Deepgram/ElevenLabs in Node.js

## Next Steps

1. ✅ **Test escalation** - Run the demo (done!)
2. 📱 **Add STT/TTS** - For full voice capabilities
3. 📞 **Add phone number** - Via Twilio/Telnyx SIP
4. 🚀 **Deploy** - To Fly.io or Railway
5. 📊 **Monitor** - Track calls and escalations

## Resources

- [LiveKit Agents Docs](https://docs.livekit.io/agents/)
- [LiveKit Node.js SDK](https://github.com/livekit/node-sdks)
- [Gemini Function Calling](https://ai.google.dev/docs/function_calling)
- [SIP Integration](https://docs.livekit.io/home/get-started/sip/)
