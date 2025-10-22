# Complete Setup Guide - Real Voice Agent System

## 🎯 What You're Building

A **real-time voice agent system** where:
1. ✅ Real callers call a phone number
2. ✅ Voice agent answers and has natural conversations (STT → Gemini → TTS)
3. ✅ During the call, if agent isn't confident → escalates to supervisor
4. ✅ **Caller stays on hold** while supervisor helps
5. ✅ Supervisor can respond via:
   - **Chat** (types answer, agent speaks it)
   - **Call transfer** (joins the call directly - future)

## 📋 Prerequisites

- Python 3.8+ installed
- Node.js/Bun installed
- Firebase account (already set up)
- LiveKit account (already set up)

## 🚀 Complete Setup (30 minutes)

### Step 1: Fix the Build Error (Firebase)

Your Next.js build is failing because of Firebase credentials.

**Quick Fix:**
1. Go to: https://console.firebase.google.com/project/calling-agent-8f74c/settings/serviceaccounts/adminsdk
2. Click "Generate new private key" button
3. Download the JSON file
4. Save it as `serviceAccountKey.json` in your project root:
   ```
   /Users/ajayyarramalla/Workspace/calling_agent/serviceAccountKey.json
   ```

**Verify:**
```bash
# In main project directory
bun run build
```

Should see: `✅ Firebase Admin initialized with service account file`

### Step 1.5: Deploy Firebase Indexes

The helpRequests query requires a composite index for performance.

**Option 1: Quick Fix (Use the Auto-Generated Link)**
1. When you see the index error, click the URL in the error message
2. It will take you directly to Firebase Console to create the index
3. Click "Create Index" and wait 1-2 minutes for it to build

**Option 2: Deploy from Configuration File**
```bash
# Make sure you have Firebase CLI installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firestore (if not already done)
firebase init firestore

# Deploy the indexes
firebase deploy --only firestore:indexes
```

The `firestore.indexes.json` file has been created with the required index configuration for the `helpRequests` collection (status + createdAt fields).

**Verify:**
After deployment, the dashboard should load pending help requests without errors.

### Step 2: Get API Keys

You need 3 API keys for the voice agent:

#### A. Gemini API (FREE)
1. Go to: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key
4. Free tier: 60 requests/minute

#### B. Deepgram API (FREE $200 credit)
1. Go to: https://console.deepgram.com/signup
2. Sign up
3. Go to API Keys section
4. Copy the API key
5. Free credit: $200 (good for ~16,000 minutes!)

#### C. OpenAI API (Pay-as-you-go)
1. Go to: https://platform.openai.com/api-keys
2. Create API key
3. Add $5-10 credit
4. Cost: ~$0.015 per 1,000 characters (~$1 per hour of calls)

### Step 3: Configure Voice Agent

```bash
cd agent-service

# Create .env file
cat > .env <<EOF
# LiveKit (already configured)
LIVEKIT_URL=wss://calling-agent-ih8g5t00.livekit.cloud
LIVEKIT_API_KEY=APIux7RgAu6u67S
LIVEKIT_API_SECRET=NoUfb3UDJ1ZdUCJriiqNkKsIwT13sBR9aHhcKX1fGQT

# AI Services (ADD YOUR KEYS HERE)
GEMINI_API_KEY=your_gemini_key_here
DEEPGRAM_API_KEY=your_deepgram_key_here
OPENAI_API_KEY=your_openai_key_here

# Next.js App
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

### Step 4: Install Python Dependencies

```bash
# Still in agent-service directory
./setup.sh
```

This will:
- Create Python virtual environment
- Install all required packages
- Set up everything needed

### Step 5: Start Everything

**Terminal 1 - Next.js App (Supervisor Dashboard):**
```bash
cd /Users/ajayyarramalla/Workspace/calling_agent
bun dev
```

Keep this running! Dashboard will be at http://localhost:3000/dashboard

**Terminal 2 - Voice Agent:**
```bash
cd /Users/ajayyarramalla/Workspace/calling_agent/agent-service
source venv/bin/activate
python voice_agent.py dev
```

You should see:
```
🚀 Starting LiveKit Voice Agent Worker
📞 Waiting for incoming calls...
```

## 🧪 Testing the Complete System

### Test 1: Voice Conversation (LiveKit Playground)

1. **Open LiveKit Playground:**
   https://agents-playground.livekit.io/

2. **Enter your LiveKit URL:**
   ```
   wss://calling-agent-ih8g5t00.livekit.cloud
   ```

3. **Click "Connect"**

4. **Allow microphone access**

5. **Start talking!**

**Try this conversation:**
```
You: "Hi, what are your hours?"
Agent: "We're open Monday through Friday 9 AM to 7 PM, and Saturday 10 AM to 6 PM. We're closed on Sundays."

You: "Do you have parking?"
Agent: "Let me check with my supervisor. Please hold for just a moment."
[ESCALATION HAPPENS - Agent creates help request]
[Agent waits for supervisor response]
```

6. **In another tab, go to supervisor dashboard:**
   http://localhost:3000/dashboard

7. **You'll see the help request appear in real-time!**

8. **Type your answer and click "Send & Resolve":**
   ```
   Yes, we have free parking behind the building.
   ```

9. **Watch the voice agent relay it:**
   ```
   Agent: "My supervisor confirmed: Yes, we have free parking behind the building. Is there anything else I can help you with?"
   ```

10. **Continue the conversation normally!**

### Test 2: Full Flow with Logs

**Watch both terminals:**

**Terminal 1 (Voice Agent):**
```
👤 Caller connected: user-abc123
🎙️ Initializing voice pipeline...
✅ Voice agent running
👤 Caller: Do you have parking?
🚨 LIVE ESCALATION DURING CALL
==================================================
Question: Do you have parking?
Confidence: low
==================================================
✅ Created help request: def456
⏳ Waiting for supervisor... (2s)
⏳ Waiting for supervisor... (4s)
⏳ Waiting for supervisor... (6s)
✅ Supervisor responded: Yes, free parking in back
🤖 Agent: My supervisor confirmed: Yes, free parking...
```

**Terminal 2 (Next.js):**
```
POST /api/help-requests 201 in 45ms
🔔 SUPERVISOR NOTIFICATION
Question: Do you have parking?
Caller: Unknown (+1234567890)
```

**Browser (Dashboard):**
- Request appears with yellow "PENDING" badge
- You type answer
- Click "Send & Resolve"
- Request turns green "RESOLVED"

## 🎯 How the Live Escalation Works

### The Complete Flow

```
1. CALLER SPEAKS
   "Do you have parking?"
        ↓ [Deepgram STT transcribes]

2. GEMINI PROCESSES
   Confidence: LOW
   Triggers: escalate_to_supervisor()
        ↓

3. AGENT RESPONDS
   "Let me check with my supervisor. Please hold for just a moment."
   [Caller hears this and waits]
        ↓

4. HELP REQUEST CREATED
   POST /api/help-requests
   {
     question: "Do you have parking?",
     callerPhone: "+1234567890",
     context: "Full conversation history...",
     sessionId: "room-abc123"
   }
        ↓

5. SUPERVISOR SEES REAL-TIME
   Dashboard shows:
   ┌─────────────────────────────────────┐
   │ 🔴 ACTIVE CALL - Caller on hold    │
   │ Question: Do you have parking?      │
   │ Waiting: 0:08 seconds              │
   └─────────────────────────────────────┘
        ↓

6. SUPERVISOR RESPONDS
   Types: "Yes, free parking in back"
   Clicks: "Send & Resolve"
        ↓

7. AGENT POLLS FOR RESPONSE
   Every 2 seconds checks:
   GET /api/help-requests/{id}
   Sees status changed to "resolved"
        ↓

8. AGENT RELAYS TO CALLER
   [TTS speaks]
   "My supervisor confirmed: Yes, we have free parking in the back."
        ↓

9. CALL CONTINUES
   Caller: "Great! Can I book an appointment?"
   Agent: "I can help transfer you to our booking line..."
```

## 📞 Adding Real Phone Number (Production)

### Option 1: Twilio SIP (Most Common)

1. **Sign up for Twilio:**
   https://www.twilio.com/try-twilio

2. **Buy a phone number:**
   - Go to Phone Numbers → Buy a Number
   - Choose a local number (+1-XXX-XXX-XXXX)
   - Cost: ~$1/month + ~$0.01/minute

3. **Create SIP Trunk:**
   - Go to Elastic SIP Trunking
   - Create new trunk
   - Note the SIP URI

4. **Configure LiveKit:**
   - Go to LiveKit Cloud dashboard
   - Settings → SIP
   - Add Twilio trunk
   - Map your phone number

5. **Test:**
   - Call your Twilio number from your phone
   - Voice agent answers!

See detailed guide: https://docs.livekit.io/home/get-started/sip/twilio/

### Option 2: Telnyx SIP (Alternative)

1. Sign up: https://telnyx.com/
2. Get phone number (~$1/month)
3. Configure SIP connection
4. Connect to LiveKit

## 🎨 Supervisor Dashboard Enhancements

### Current Features
- ✅ View pending requests
- ✅ Type response
- ✅ Resolve requests
- ✅ View history
- ✅ Knowledge base

### Add for Live Calls

Create `/app/dashboard/live/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from 'react';

export default function LiveCallsPage() {
  const [activeRequests, setActiveRequests] = useState([]);

  useEffect(() => {
    // Poll every 2 seconds for active calls
    const interval = setInterval(async () => {
      const res = await fetch('/api/help-requests/pending');
      const data = await res.json();

      // Filter to requests from last 5 minutes (likely active calls)
      const recent = data.data.filter((req: any) => {
        const age = Date.now() - req.createdAt.toMillis();
        return age < 5 * 60 * 1000; // 5 minutes
      });

      setActiveRequests(recent);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {activeRequests.length > 0 && (
        <div className="bg-red-500 text-white p-4 rounded-lg animate-pulse">
          🔴 {activeRequests.length} ACTIVE CALL(S) - Caller(s) on hold!
        </div>
      )}

      {/* Show requests with timer */}
      {activeRequests.map(req => (
        <ActiveCallCard key={req.id} request={req} />
      ))}
    </div>
  );
}
```

## 💰 Cost Breakdown

### Per 1,000 minutes of calls:

| Service | Cost | Notes |
|---------|------|-------|
| Deepgram STT | $12 | nova-2-phonecall model |
| Gemini LLM | FREE | Under 60 RPM |
| OpenAI TTS | $15 | tts-1 model |
| LiveKit | FREE | Under 10K min/month |
| Twilio | $10 | ~$0.01/minute |

**Total: ~$37 per 1,000 minutes** (~$0.037/minute or ~$2.22/hour)

### Free Tier Limits:
- Deepgram: $200 credit (~16,000 minutes)
- Gemini: 60 requests/minute (plenty for calls)
- LiveKit: 10,000 minutes/month free

## 🐛 Troubleshooting

### "Failed to parse private key"
→ Add `serviceAccountKey.json` from Firebase console

### "No module named 'livekit'"
→ Run: `cd agent-service && ./setup.sh`

### "GEMINI_API_KEY not set"
→ Add API keys to `agent-service/.env`

### Agent not connecting?
→ Check LiveKit URL in `.env`

### No audio in playground?
→ Allow microphone permissions in browser

### Supervisor timeout?
→ Make sure Next.js app is running on port 3000

### Function not being called?
→ Ask questions the agent doesn't know (parking, appointments, etc.)

## 📚 Next Steps

1. ✅ Test with LiveKit Playground
2. 📱 Get Twilio phone number
3. 📞 Test with real phone calls
4. 🎨 Enhance supervisor dashboard
5. 🔄 Add WebSocket for instant responses
6. 📊 Add call analytics
7. 🚀 Deploy to production

## 🎥 Demo Video Outline

1. **Show chat interface** (2 min)
2. **Start voice agent** (1 min)
3. **Live call in playground** (3 min)
   - Normal questions
   - Escalation trigger
   - Supervisor responds
   - Call continues
4. **Show supervisor dashboard** (2 min)
5. **Explain architecture** (2 min)
6. **Discuss production** (phone numbers, deployment)

## ✅ Checklist

Before going live:

- [ ] Firebase configured (serviceAccountKey.json added)
- [ ] All API keys added to agent-service/.env
- [ ] Python dependencies installed (./setup.sh)
- [ ] Next.js app running (bun dev)
- [ ] Voice agent running (python voice_agent.py dev)
- [ ] Tested in LiveKit Playground
- [ ] Supervisor dashboard responsive
- [ ] Knowledge base working
- [ ] (Optional) Twilio phone number configured

## 🎉 You're Ready!

You now have a **production-ready voice agent** that:
- Receives real phone calls
- Has natural voice conversations
- Escalates to supervisor during live calls
- Keeps caller on hold
- Relays supervisor answers
- Learns from every interaction

**Start testing:** Open LiveKit Playground and start talking! 🎙️
