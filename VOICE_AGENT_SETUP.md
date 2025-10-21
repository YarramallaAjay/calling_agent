# Voice Agent Setup Guide

## 🎯 What You Now Have

A complete **voice agent system** with:

1. ✅ **Chat-based agent** - Working demo at http://localhost:3000
2. ✅ **Voice agent foundation** - Node.js/TypeScript agent in `agent-service/`
3. ✅ **Escalation system** - Full conversation context tracking
4. ✅ **Supervisor dashboard** - Real-time updates
5. ✅ **Knowledge base** - Auto-learning from supervisor responses

## 🚀 Quick Start (3 Steps)

### Step 1: Add Gemini API Key

```bash
# In agent-service/.env, add your key:
GEMINI_API_KEY=your_gemini_api_key_here
```

Get one from: https://aistudio.google.com/app/apikey

### Step 2: Start Next.js App

```bash
# In main project directory
bun dev
```

Keep this running!

### Step 3: Test the Voice Agent

```bash
# In a new terminal
cd agent-service
bun dev
```

You'll see:
```
🚀 Starting LiveKit Voice Agent...
📋 Configuration:
  LiveKit URL: wss://calling-agent-ih8g5t00.livekit.cloud
  API URL: http://localhost:3000
  Gemini API Key: ✓ Set

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
✅ Help request created: abc123def
```

### Step 4: Check Supervisor Dashboard

Open http://localhost:3000/dashboard and you'll see the help request!

## 📞 How It Works

### Current Implementation

The voice agent (`agent-service/agent.ts`) includes:

1. **Conversation Tracking**
   ```typescript
   conversationTracker.addMessage('user', 'Do you have parking?');
   conversationTracker.addMessage('assistant', 'Let me check...');
   ```

2. **Escalation Function**
   ```typescript
   async function escalateToSupervisor(params, context) {
     // Gets full conversation context
     // Creates help request via API
     // Returns confirmation message
   }
   ```

3. **LiveKit Room Setup**
   - Connects to LiveKit
   - Listens for participants
   - Tracks audio streams
   - Ready for voice integration

### What's Missing for Full Voice?

The current implementation handles:
- ✅ Escalation logic
- ✅ Conversation context
- ✅ Help request creation
- ✅ LiveKit room connection

To add **real voice calling**, you need:
- ⚠️ Speech-to-Text (STT)
- ⚠️ Text-to-Speech (TTS)
- ⚠️ Phone number (SIP integration)

## 🎤 Adding Voice Capabilities

### Option 1: Use Python SDK (Easiest)

LiveKit's Python SDK has built-in voice pipeline:

```bash
cd agent-service

# Install Python dependencies
pip install livekit-agents livekit-plugins-google livekit-plugins-silero

# Create Python agent
```

See: https://docs.livekit.io/agents/start/voice-ai/

### Option 2: Add STT/TTS to Node.js

Integrate external services:

**1. Add Deepgram (Speech-to-Text)**
```bash
bun add @deepgram/sdk
```

**2. Add ElevenLabs (Text-to-Speech)**
```bash
bun add elevenlabs-node
```

**3. Wire them up:**
```typescript
// Pseudo-code
audioTrack → Deepgram STT → Gemini LLM → ElevenLabs TTS → audioTrack
```

### Option 3: Use LiveKit Playground (Testing)

1. Start agent: `bun dev`
2. Go to: https://agents-playground.livekit.io/
3. Enter URL: `wss://calling-agent-ih8g5t00.livekit.cloud`
4. Connect and talk!

(Note: Requires STT/TTS integration first)

## 📱 Adding Phone Number

To receive real phone calls:

### Option 1: Twilio SIP

1. Sign up for Twilio
2. Get a phone number
3. Configure SIP trunk to forward to LiveKit
4. See: https://docs.livekit.io/home/get-started/sip/

### Option 2: Telnyx SIP

1. Sign up for Telnyx
2. Configure SIP connection
3. Forward to LiveKit endpoint

### Option 3: LiveKit Cloud SIP (Coming Soon)

Direct phone number provisioning from LiveKit.

## 🔧 Current Architecture

```
┌─────────────┐
│   Caller    │
│  (Chat UI)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   Chat Interface    │
│   (Gemini Agent)    │
└──────┬──────────────┘
       │
       ├──► Knowledge Base Search
       │
       └──► escalate_to_supervisor()
                    │
                    ▼
             ┌──────────────┐
             │   Firebase   │
             │  Firestore   │
             └──────┬───────┘
                    │
                    ▼
             ┌──────────────┐
             │  Supervisor  │
             │  Dashboard   │
             └──────────────┘
```

### Future Architecture (With Voice)

```
┌─────────────┐
│   Caller    │
│   (Phone)   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   LiveKit Room      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   Voice Agent       │
│   ┌─────────────┐   │
│   │     STT     │   │
│   └──────┬──────┘   │
│          ▼          │
│   ┌─────────────┐   │
│   │   Gemini    │   │
│   └──────┬──────┘   │
│          ▼          │
│   ┌─────────────┐   │
│   │     TTS     │   │
│   └─────────────┘   │
└─────────────────────┘
       │
       ├──► escalate_to_supervisor()
       │
       ▼
[Same as above: Firebase → Dashboard]
```

## 📝 Testing the Current System

### Test 1: Chat Agent (Already Working)

1. Go to http://localhost:3000
2. Ask: "What are your hours?"
3. Get instant answer
4. Ask: "Do you have parking?"
5. See escalation happen
6. Check dashboard for help request

### Test 2: Voice Agent Escalation

1. Run: `cd agent-service && bun dev`
2. Agent creates test escalation
3. Check http://localhost:3000/dashboard
4. Respond to the request
5. See follow-up webhook in console

## 🎓 Next Steps

### For This Week (MVP Demo)

1. ✅ Show chat interface working
2. ✅ Demonstrate escalation
3. ✅ Show supervisor dashboard
4. ✅ Explain voice agent architecture
5. 📹 Record video demo

### After Initial Submission

1. **Add STT/TTS** - For real voice calls
2. **Get phone number** - Via Twilio SIP
3. **Deploy agent** - To Fly.io/Railway
4. **Test with real calls** - End-to-end
5. **Monitor and improve** - Based on usage

## 📚 Resources

### Documentation
- [LiveKit Agents Guide](https://docs.livekit.io/agents/)
- [Node.js SDK](https://github.com/livekit/node-sdks)
- [Voice AI Quickstart](https://docs.livekit.io/agents/start/voice-ai/)
- [SIP Integration](https://docs.livekit.io/home/get-started/sip/)

### Tools
- [LiveKit Playground](https://agents-playground.livekit.io/)
- [Gemini API](https://aistudio.google.com/app/apikey)
- [Deepgram](https://deepgram.com/)
- [ElevenLabs](https://elevenlabs.io/)

## ✅ What's Complete

- ✅ Full escalation system with conversation context
- ✅ Help request creation
- ✅ Supervisor dashboard
- ✅ Knowledge base auto-learning
- ✅ Real-time updates
- ✅ LiveKit room integration
- ✅ Clean TypeScript codebase
- ✅ Comprehensive documentation

## ⚠️ What Needs Work (For Production Voice)

- ⚠️ STT integration (Deepgram/Google)
- ⚠️ TTS integration (ElevenLabs/Google)
- ⚠️ Phone number (Twilio SIP)
- ⚠️ Production deployment
- ⚠️ Error recovery
- ⚠️ Call recording
- ⚠️ Analytics

## 💡 Pro Tips

1. **For MVP demo** - Focus on the chat interface and escalation flow
2. **For voice** - Use Python SDK (easier) or add STT/TTS to Node.js
3. **For testing** - Use LiveKit Playground before adding phone numbers
4. **For deployment** - Start with Fly.io (easiest for agents)

## 🎥 Demo Video Outline

1. **Show chat interface** (2 min)
   - Ask known questions
   - Ask unknown question
   - Show escalation

2. **Show supervisor dashboard** (2 min)
   - See pending request
   - Respond to it
   - Show follow-up

3. **Show knowledge base** (1 min)
   - See learned answer
   - Ask same question again
   - Get instant response

4. **Explain architecture** (2 min)
   - Show code structure
   - Explain escalation logic
   - Discuss voice integration path

5. **Discuss scalability** (2 min)
   - Database design
   - 10/day → 1,000/day plan
   - Future improvements

Total: ~10 minutes

## Questions?

Check the READMEs:
- Main project: `/README.md`
- Voice agent: `/agent-service/README.md`

Or see the LiveKit docs: https://docs.livekit.io/
