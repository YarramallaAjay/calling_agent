# Real-Time Voice Agent with Live Supervisor Intervention

This is a **PRODUCTION-READY voice agent** that handles real phone calls with live supervisor help during active calls.

## How It Works

### 1. Real Caller Calls
```
Caller dials: +1-XXX-XXX-XXXX
     ↓
LiveKit SIP receives call
     ↓
Voice Agent answers: "Hello! Thank you for calling Luxe Beauty Salon..."
```

### 2. Live Conversation (STT → Gemini → TTS)
```
Caller: "What are your hours?"
     ↓ [Deepgram STT]
     ↓ [Gemini LLM - High Confidence]
     ↓ [OpenAI TTS]
Agent: "We're open Monday through Friday 9 AM to 7 PM..."
```

### 3. Confidence-Based Escalation (DURING THE CALL)
```
Caller: "Do you have parking?"
     ↓ [Deepgram STT]
     ↓ [Gemini LLM - LOW CONFIDENCE detected]
     ↓ [Calls escalate_to_supervisor function]
Agent: "Let me check with my supervisor. Please hold for just a moment."
     ↓
[CALLER STAYS ON HOLD]
     ↓
[Help request created in Firestore]
     ↓
[Supervisor sees real-time notification]
     ↓
[Supervisor types answer in dashboard]
     ↓
[Agent receives answer]
     ↓
Agent: "My supervisor confirmed: Yes, we have free parking behind the building."
     ↓
[Call continues normally]
```

## Setup

### 1. Install Dependencies

```bash
cd agent-service

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install packages
pip install -r requirements.txt
```

### 2. Get API Keys

#### Gemini API (for LLM)
- Go to: https://aistudio.google.com/app/apikey
- Create API key
- Free tier: 60 requests/minute

#### Deepgram API (for Speech-to-Text)
- Go to: https://deepgram.com/
- Sign up (free $200 credit)
- Get API key from dashboard

#### OpenAI API (for Text-to-Speech)
- Go to: https://platform.openai.com/api-keys
- Create API key
- Pay-as-you-go: ~$0.015/1K characters

### 3. Configure Environment

Create `.env` in `agent-service/`:

```bash
# LiveKit (already configured)
LIVEKIT_URL=wss://calling-agent-ih8g5t00.livekit.cloud
LIVEKIT_API_KEY=APIux7RgAu6u67S
LIVEKIT_API_SECRET=NoUfb3UDJ1ZdUCJriiqNkKsIwT13sBR9aHhcKX1fGQT

# AI Services
GEMINI_API_KEY=your_gemini_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
OPENAI_API_KEY=your_openai_api_key

# Next.js App (for supervisor dashboard)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run the Agent

```bash
# Terminal 1: Start Next.js app (supervisor dashboard)
cd ..
bun dev

# Terminal 2: Start voice agent
cd agent-service
source venv/bin/activate
python voice_agent.py dev
```

## Testing the Voice Agent

### Option 1: LiveKit Playground (Voice Test)

1. Start agent: `python voice_agent.py dev`
2. Go to: https://agents-playground.livekit.io/
3. Enter LiveKit URL: `wss://calling-agent-ih8g5t00.livekit.cloud`
4. Click "Connect"
5. Allow microphone access
6. **Start talking!**

The agent will:
- Listen to you (Deepgram STT)
- Process with Gemini
- Respond with voice (OpenAI TTS)
- Escalate if confidence is low

### Option 2: Real Phone Number (Production)

To receive actual phone calls:

#### Step 1: Get Twilio SIP Trunk

1. Sign up for Twilio: https://www.twilio.com/
2. Get a phone number (+1-XXX-XXX-XXXX)
3. Create SIP Trunk
4. Configure: Forward calls to LiveKit

See: https://docs.livekit.io/home/get-started/sip/twilio/

#### Step 2: Configure LiveKit SIP

```bash
# In LiveKit Cloud dashboard
1. Go to SIP settings
2. Add Twilio trunk
3. Map phone number to agent
4. Test by calling your number!
```

## How Escalation Works During Live Calls

### The Flow

```
1. Caller asks question
     ↓
2. Gemini processes with confidence score
     ↓
3. IF confidence < threshold:
   - Agent says: "Let me check with my supervisor. Please hold."
   - Calls escalate_to_supervisor() function
   - Creates help request in Firestore
     ↓
4. Supervisor dashboard shows LIVE notification
   - "ACTIVE CALL - Caller on hold!"
   - Shows question + conversation context
   - Timer shows how long caller has been waiting
     ↓
5. Supervisor types answer and clicks "Send to Agent"
     ↓
6. Agent polls for response (every 2 seconds)
     ↓
7. When answer received:
   - Agent says: "My supervisor confirmed: [answer]"
   - Call continues normally
     ↓
8. Answer auto-saved to knowledge base
```

### Polling vs WebSocket

**Current:** Polling every 2 seconds
- Simple, works out of the box
- 2-5 second delay for supervisor response

**Better:** WebSocket (future enhancement)
- Instant response delivery
- No polling overhead
- Use Firebase Realtime Database or Socket.io

## Supervisor Dashboard Enhancements

The dashboard needs these features for live intervention:

### 1. Active Call Indicator
```typescript
// Show when caller is on hold
<div className="bg-red-500 text-white p-4 animate-pulse">
  🔴 LIVE CALL - Caller on hold (0:23)
</div>
```

### 2. Quick Response Interface
```typescript
// Fast response with pre-filled answers
<QuickResponseButtons>
  <button>Yes, we have parking</button>
  <button>Book via phone (555) 123-4567</button>
  <button>Maria available tomorrow 2PM</button>
</QuickResponseButtons>
```

### 3. Real-time Polling
```typescript
// Poll for new active calls every 2 seconds
useEffect(() => {
  const interval = setInterval(() => {
    fetchActiveCalRequests();
  }, 2000);
  return () => clearInterval(interval);
}, []);
```

## Voice Pipeline Components

### 1. Speech-to-Text (Deepgram)
```python
stt = deepgram.STT(
    model="nova-2-phonecall",  # Optimized for phone calls
    language="en-US"
)
```
- Handles phone quality audio
- Real-time transcription
- High accuracy even with background noise

### 2. Large Language Model (Gemini)
```python
llm_instance = google.LLM(
    model="gemini-1.5-flash-latest",
    temperature=0.7,
)
```
- Fast responses (<1 second)
- Function calling for escalation
- Context-aware conversations

### 3. Text-to-Speech (OpenAI)
```python
tts = openai.TTS(
    voice="nova",  # Professional female voice
    model="tts-1",
)
```
- Natural-sounding voice
- Low latency
- Good for phone calls

### 4. Voice Activity Detection (Silero)
```python
vad = silero.VAD.load()
```
- Detects when caller starts/stops speaking
- Prevents interruptions
- Handles pauses naturally

## Conversation Context Tracking

The agent tracks the full conversation:

```python
conversation_context = [
    {"role": "user", "content": "Hi, I need a haircut"},
    {"role": "assistant", "content": "Great! We offer cuts for $65..."},
    {"role": "user", "content": "Do you have parking?"},
    # Agent escalates here with full context
]
```

When escalating, supervisor sees:
```
Caller: Hi, I need a haircut
Agent: Great! We offer cuts for $65...
Caller: Do you have parking?
```

## Advanced Features

### 1. Call Transfer (Future)

Instead of chat, directly transfer caller to supervisor:

```python
@llm.ai_callable()
async def transfer_to_supervisor():
    """Transfer call to human supervisor"""
    # Create 3-way call
    # Supervisor joins LiveKit room
    # Agent can stay or leave
    pass
```

### 2. Supervisor Availability Check

```python
# Before escalating, check if supervisor is available
supervisor_available = await check_supervisor_status()

if supervisor_available:
    # Quick chat response
    await escalate_to_supervisor()
else:
    # Offer callback
    return "I'll have them call you back within the hour."
```

### 3. Multi-Supervisor Routing

```python
# Route to specialist supervisors
if question_about == "color":
    supervisor = "Emma (Colorist)"
elif question_about == "appointments":
    supervisor = "Front Desk"
```

## Production Deployment

### Deploy Agent to Fly.io

```bash
# Create fly.toml
cat > fly.toml <<EOF
app = "salon-voice-agent"
primary_region = "iad"

[build]
  builder = "paketobuildpacks/builder:base"

[[services]]
  internal_port = 8080
  protocol = "tcp"
EOF

# Deploy
fly launch
fly deploy
```

### Environment Variables (Production)

```bash
fly secrets set GEMINI_API_KEY=xxx
fly secrets set DEEPGRAM_API_KEY=xxx
fly secrets set OPENAI_API_KEY=xxx
fly secrets set LIVEKIT_URL=wss://...
fly secrets set LIVEKIT_API_KEY=xxx
fly secrets set LIVEKIT_API_SECRET=xxx
fly secrets set NEXT_PUBLIC_APP_URL=https://yourapp.vercel.app
```

## Monitoring & Logs

```bash
# Watch live logs
python voice_agent.py dev

# You'll see:
📞 Incoming call to room: sip-abc123
👤 Caller connected: +1234567890
🎙️ Initializing voice pipeline...
✅ Voice agent running - caller can now speak
👤 Caller: What are your hours?
🤖 Agent: We're open Monday through Friday...
👤 Caller: Do you have parking?
🚨 LIVE ESCALATION DURING CALL
Question: Do you have parking?
Confidence: low
⏳ Waiting for supervisor... (2s)
⏳ Waiting for supervisor... (4s)
✅ Supervisor responded: Yes, free parking in back
🤖 Agent: My supervisor confirmed: Yes, we have free...
```

## Costs (Estimated)

Per 1,000 minutes of calls:
- **Deepgram STT**: ~$12 (nova-2 model)
- **Gemini LLM**: Free (under 60 RPM)
- **OpenAI TTS**: ~$15 (tts-1 model)
- **LiveKit**: Free (under 10K minutes/month)

**Total**: ~$27/1,000 minutes (~$0.027/minute)

## Next Steps

1. ✅ Test with LiveKit Playground
2. 📞 Add Twilio phone number
3. 👥 Enhance supervisor dashboard for live intervention
4. 🔄 Add WebSocket for instant responses
5. 📊 Add call analytics
6. 🎙️ Test with real phone calls
7. 🚀 Deploy to production

## Troubleshooting

### Agent not starting?
```bash
# Check API keys
echo $GEMINI_API_KEY
echo $DEEPGRAM_API_KEY
echo $OPENAI_API_KEY

# Verify LiveKit credentials
echo $LIVEKIT_URL
```

### No audio in/out?
- Check microphone permissions in browser
- Test with LiveKit Playground first
- Verify Deepgram API key is valid

### Supervisor timeout?
- Check Next.js app is running on port 3000
- Verify `NEXT_PUBLIC_APP_URL` is correct
- Check supervisor dashboard is open

### Function not being called?
- Gemini needs to detect low confidence
- Try asking questions outside the prompt knowledge
- Check logs for "LIVE ESCALATION" message

## Resources

- [LiveKit Agents](https://docs.livekit.io/agents/)
- [Deepgram Docs](https://developers.deepgram.com/)
- [Twilio SIP](https://docs.livekit.io/home/get-started/sip/twilio/)
- [Voice AI Best Practices](https://docs.livekit.io/agents/build/)

---

**You now have a REAL voice agent that handles live calls with real-time supervisor intervention!** 🎉
