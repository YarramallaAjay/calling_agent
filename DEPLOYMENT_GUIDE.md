# Deployment Guide: Fly.io + Vercel

This guide will help you deploy your calling agent to production using free tiers.

## Architecture

```
Fly.io (Python Agent)  ←→  Firebase (Database)  ←→  Vercel (Next.js Dashboard)
        ↓
   LiveKit Cloud
```

---

## Part 1: Deploy Python Agent to Fly.io (10 minutes)

### Step 1: Install Fly CLI

**Mac/Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

**Windows (PowerShell):**
```powershell
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### Step 2: Login to Fly.io

```bash
fly auth login
```

This will open a browser for authentication.

### Step 3: Navigate to Agent Directory

```bash
cd /Users/ajayyarramalla/Workspace/calling_agent/agent-service
```

### Step 4: Launch the App

```bash
fly launch
```

Answer the prompts:
- **App name:** `calling-agent-voice` (or your choice)
- **Region:** Choose closest to you (e.g., `iad` for US East)
- **PostgreSQL:** No
- **Redis:** No
- **Deploy now:** No (we need to set secrets first)

### Step 5: Set Environment Variables (Secrets)

```bash
# LiveKit credentials
fly secrets set LIVEKIT_URL="wss://calling-agent-ih8g5t00.livekit.cloud"
fly secrets set LIVEKIT_API_KEY="APIux7RgAu6u67S"
fly secrets set LIVEKIT_API_SECRET="NoUfb3UDJ1ZdUCJriiqNkKsIwT13sBR9aHhcKX1fGQT"

# AI Services
fly secrets set GEMINI_API_KEY="AIzaSyAH3BNXnItdr73LRseMOGxMCUpzoluZGUI"
fly secrets set DEEPGRAM_API_KEY="aecb4007fb88d72f3ae317ef7fdc37fd7d7e4794"

# App URL (update this after Vercel deployment)
fly secrets set NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Step 6: Deploy

```bash
fly deploy
```

### Step 7: Check Status

```bash
fly status
fly logs
```

You should see logs like:
```
Incoming call to room: first_room
Starting voice agent session
```

---

## Part 2: Deploy Next.js to Vercel (5 minutes)

### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 2: Navigate to Project Root

```bash
cd /Users/ajayyarramalla/Workspace/calling_agent
```

### Step 3: Deploy

```bash
vercel
```

Answer the prompts:
- **Set up and deploy:** Yes
- **Scope:** Your personal account
- **Link to existing project:** No
- **Project name:** `calling-agent`
- **Directory:** `./` (current directory)
- **Override settings:** No

### Step 4: Set Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these:

**Firebase:**
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAdQzST_CrMGGEXcbIPhT8aXlhjrs5FhyE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=calling-agent-8f74c.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=calling-agent-8f74c
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=calling-agent-8f74c.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=159216597859
NEXT_PUBLIC_FIREBASE_APP_ID=1:159216597859:web:80df5ca5194a6de505f156

FIREBASE_ADMIN_PROJECT_ID=calling-agent-8f74c
FIREBASE_ADMIN_CLIENT_EMAIL=ajay.yarramalla@gmail.com
FIREBASE_ADMIN_PRIVATE_KEY=b14a6a95323512704ad263d5ef65ffd59b6ce364
```

**LiveKit:**
```
LIVEKIT_URL=wss://calling-agent-ih8g5t00.livekit.cloud
LIVEKIT_API_KEY=APIux7RgAu6u67S
LIVEKIT_API_SECRET=NoUfb3UDJ1ZdUCJriiqNkKsIwT13sBR9aHhcKX1fGQT
```

**App URL (important - use your actual Vercel URL):**
```
NEXT_PUBLIC_APP_URL=https://calling-agent.vercel.app
```

### Step 5: Redeploy

```bash
vercel --prod
```

---

## Part 3: Connect Both Services

### Step 1: Update Fly.io with Vercel URL

```bash
cd /Users/ajayyarramalla/Workspace/calling_agent/agent-service

# Update with your actual Vercel URL
fly secrets set NEXT_PUBLIC_APP_URL="https://calling-agent.vercel.app"
```

### Step 2: Verify Deployment

**Check Fly.io logs:**
```bash
fly logs
```

Look for:
```
Using API URL: https://calling-agent.vercel.app
API connection verified
```

**Check Vercel:**
- Open `https://calling-agent.vercel.app/dashboard`
- You should see the supervisor dashboard

---

## Part 4: Test the System

### Step 1: Create a LiveKit Token

```bash
cd /Users/ajayyarramalla/Workspace/calling_agent/agent-service
source venv/bin/activate
python generate_token.py
```

This will output a token and URL.

### Step 2: Connect to LiveKit Playground

1. Go to: https://agents-playground.livekit.io/
2. Paste your token
3. Click "Connect"
4. Start talking: "Hi, I need information about your services"

### Step 3: Test Escalation

1. Ask: "Do you have appointments tomorrow at 2pm?"
2. Bella should say: "Let me check with my supervisor..."
3. Go to your Vercel dashboard: `https://calling-agent.vercel.app/dashboard`
4. You should see the question appear
5. Type a response and click "Resolve"
6. Bella should speak your response back to you

---

## Monitoring & Troubleshooting

### Check Fly.io Logs
```bash
fly logs
fly status
```

### Check Vercel Logs
- Go to Vercel Dashboard → Your Project → Functions
- Click on any function to see logs

### Common Issues

**Agent not connecting:**
- Check `fly logs` for errors
- Verify LIVEKIT_* secrets are set correctly
- Ensure app is running: `fly status`

**Escalation not working:**
- Verify NEXT_PUBLIC_APP_URL is set correctly on Fly.io
- Check Vercel function logs
- Test Firebase connection

**"API connection failed" error:**
- Fly.io can't reach Vercel
- Double-check NEXT_PUBLIC_APP_URL secret
- Ensure Vercel deployment is successful

---

## Costs

- **Fly.io:** Free (256MB RAM, 3 VMs)
- **Vercel:** Free (hobby tier, unlimited)
- **Firebase:** Free (1GB storage, 50K reads/day)
- **LiveKit:** Free (50GB bandwidth/month)

**Total: $0/month** ✅

---

## Next Steps

- Set up custom domain (optional)
- Add more knowledge base articles
- Configure Firebase security rules
- Set up monitoring alerts
