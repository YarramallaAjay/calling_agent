import 'dotenv/config';
import { Room, RoomEvent, TrackKind } from '@livekit/rtc-node';
import { z } from 'zod';

// Salon business prompt
const SYSTEM_PROMPT = `You are Bella, an AI receptionist for "Luxe Beauty Salon", a premium hair and beauty salon.

## Salon Information

**Business Hours:**
- Monday - Friday: 9:00 AM - 7:00 PM
- Saturday: 10:00 AM - 6:00 PM
- Sunday: Closed

**Location:**
123 Main Street, Downtown
Phone: (555) 123-4567

**Services Offered:**
1. Haircuts & Styling
   - Women's Cut: $65
   - Men's Cut: $35
   - Kids Cut: $25
   - Blowout: $45

2. Color Services
   - Full Color: $120+
   - Highlights: $140+
   - Balayage: $180+
   - Root Touch-up: $85

3. Treatments
   - Deep Conditioning: $40
   - Keratin Treatment: $250+
   - Scalp Treatment: $50

4. Special Occasions
   - Wedding Hair: Starting at $200
   - Special Event Styling: $85+

**Stylists:**
- Maria (Senior Stylist) - Specializes in color
- James (Master Stylist) - Specializes in cuts and styling
- Sarah (Junior Stylist) - All-around services
- Emma (Colorist) - Color specialist

**Booking Policy:**
- 24-hour cancellation notice required
- Credit card required to hold appointments
- Late arrivals may need to reschedule

## Your Role & Behavior

You are friendly, professional, and helpful. Your main responsibilities are:

1. **Answer questions** about services, pricing, hours, and location
2. **If you don't know something**, use the escalate_to_supervisor function
3. **Keep responses conversational and natural** - speak like a human receptionist
4. **Keep responses brief** - this is a phone call, not a chat

## Important Guidelines

- Always be warm and welcoming
- Keep responses brief and to the point (1-2 sentences max)
- If a caller asks something you don't know, DON'T make up information
- Instead say: "Let me check with my supervisor on that. I'll have them call you back shortly."
- Then use the escalate_to_supervisor function with the question and conversation context
- After escalating, ask if there's anything else you can help with

Remember: You represent Luxe Beauty Salon. Be professional, friendly, and always prioritize excellent customer service!`;

// Conversation context tracker
class ConversationTracker {
  private messages: Array<{ role: string; content: string }> = [];

  addMessage(role: 'user' | 'assistant', content: string) {
    this.messages.push({ role, content });
    console.log(`${role === 'user' ? '👤 Caller' : '🤖 Agent'}: ${content}`);
  }

  getContext(): string {
    return this.messages
      .slice(-10) // Last 10 messages
      .map((msg) => `${msg.role === 'user' ? 'Caller' : 'Agent'}: ${msg.content}`)
      .join('\n');
  }
}

// Escalate to supervisor function
const escalateSchema = z.object({
  question: z.string().describe('The specific question the caller asked that you cannot answer'),
  callerName: z.string().default('Unknown').describe('The caller\'s name if mentioned'),
  callerPhone: z.string().default('Unknown').describe('The caller\'s phone number if available'),
});

async function escalateToSupervisor(
  params: z.infer<typeof escalateSchema>,
  context: ConversationTracker
) {
  const conversationContext = context.getContext();

  console.log('\n🚨 ESCALATING TO SUPERVISOR 🚨');
  console.log('═'.repeat(50));
  console.log('Question:', params.question);
  console.log('Caller:', params.callerName);
  console.log('Phone:', params.callerPhone);
  console.log('Conversation Context:');
  console.log(conversationContext);
  console.log('═'.repeat(50));

  try {
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/help-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: params.question,
        callerPhone: params.callerPhone,
        callerName: params.callerName,
        context: conversationContext,
      }),
    });

    const result = await response.json() as any;

    if (result.success) {
      const requestId = result.data.id;
      console.log(`✅ Help request created: ${requestId}`);

      return {
        success: true,
        message: `I've sent your question to my supervisor. They'll call you back at ${params.callerPhone} within the hour. Your reference number is ${requestId.substring(0, 8)}. Is there anything else I can help you with?`,
      };
    } else {
      console.error('❌ Failed to create help request');
      return {
        success: false,
        message: "I've made a note of your question for my supervisor. Someone will call you back shortly. Is there anything else I can help you with today?",
      };
    }
  } catch (error) {
    console.error('Error escalating to supervisor:', error);
    return {
      success: false,
      message: "I've noted your question and someone will get back to you soon. Is there anything else I can help you with?",
    };
  }
}

// Main agent entry point
async function main() {
  console.log('🚀 Starting LiveKit Voice Agent...');
  console.log('📋 Configuration:');
  console.log('  LiveKit URL:', process.env.LIVEKIT_URL);
  console.log('  API URL:', process.env.NEXT_PUBLIC_APP_URL);
  console.log('  Gemini API Key:', process.env.GEMINI_API_KEY ? '✓ Set' : '✗ Missing');

  // For now, create a simple Room connection example
  // Full voice pipeline requires additional setup

  const room = new Room();
  const conversationTracker = new ConversationTracker();

  room.on(RoomEvent.Connected, () => {
    console.log('✅ Connected to LiveKit room');
  });

  room.on(RoomEvent.ParticipantConnected, (participant) => {
    console.log(`👤 Participant connected: ${participant.identity}`);
    console.log(`📞 Phone/Metadata: ${participant.metadata}`);

    // In a full implementation, you would:
    // 1. Set up STT to transcribe incoming audio
    // 2. Send transcription to Gemini
    // 3. Process Gemini response (including function calls)
    // 4. Use TTS to convert response to audio
    // 5. Send audio back to participant
  });

  room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
    console.log(`🎵 Track subscribed: ${track.kind} from ${participant.identity}`);

    if (track.kind === TrackKind.KIND_AUDIO) {
      console.log('📥 Receiving audio from caller...');
      // Here you would process the audio stream
      // For full voice implementation, see the Python example or use a voice pipeline
    }
  });

  room.on(RoomEvent.ParticipantDisconnected, (participant) => {
    console.log(`👋 Participant disconnected: ${participant.identity}`);
  });

  console.log('\n📞 Agent is ready to receive calls');
  console.log('🔧 To test:');
  console.log('  1. Go to LiveKit Playground: https://agents-playground.livekit.io/');
  console.log('  2. Enter your LiveKit URL');
  console.log('  3. Start a voice conversation');
  console.log('\n⚠️  NOTE: Full voice pipeline (STT/TTS) requires additional setup');
  console.log('   For production, consider using the Python SDK which has full voice support');
  console.log('   Or integrate with Deepgram/ElevenLabs for STT/TTS in Node.js\n');

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down agent...');
    room.disconnect();
    process.exit(0);
  });

  // Simple demonstration of the escalation function
  console.log('\n🧪 Testing escalation function...\n');

  // Simulate a conversation
  conversationTracker.addMessage('user', 'Hi, I\'m looking for some information');
  conversationTracker.addMessage('assistant', 'Hello! Welcome to Luxe Beauty Salon. How can I help you today?');
  conversationTracker.addMessage('user', 'Do you have parking available?');

  // Test escalation
  const result = await escalateToSupervisor(
    {
      question: 'Do you have parking available?',
      callerName: 'Test User',
      callerPhone: '+1234567890',
    },
    conversationTracker
  );

  console.log('\n📤 Escalation result:', result.message);
  console.log('\n✅ Agent demonstration complete');
  console.log('💡 Check your supervisor dashboard at http://localhost:3000/dashboard');
}

// Run the agent
main().catch((error) => {
  console.error('❌ Agent error:', error);
  process.exit(1);
});
