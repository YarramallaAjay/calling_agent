import { NextRequest, NextResponse } from 'next/server';
import { WebhookReceiver } from 'livekit-server-sdk';

// LiveKit webhook receiver for room events
const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY || '',
  process.env.LIVEKIT_API_SECRET || ''
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const authorization = request.headers.get('Authorization') || '';

    // Verify the webhook is from LiveKit
    const event = await receiver.receive(body, authorization);

    // Log the event
    console.log('\n[LIVEKIT WEBHOOK EVENT]');
    console.log('═'.repeat(50));
    console.log(`Event Type: ${event.event}`);
    console.log(`Room: ${event.room?.name || 'N/A'}`);

    if (event.participant) {
      console.log(`Participant: ${event.participant.identity}`);
    }

    console.log('═'.repeat(50));
    console.log(`Full Event:`, JSON.stringify(event, null, 2));
    console.log('');

    // Handle different event types
    switch (event.event) {
      case 'room_started':
        console.log(`[SUCCESS] Room ${event.room?.name} has started`);
        break;
      case 'room_finished':
        console.log(`[INFO] Room ${event.room?.name} has finished`);
        break;
      case 'participant_joined':
        console.log(`[INFO] Participant ${event.participant?.identity} joined`);
        break;
      case 'participant_left':
        console.log(`[INFO] Participant ${event.participant?.identity} left`);
        break;
      default:
        console.log(`[INFO] Event: ${event.event}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    console.error('Error processing LiveKit webhook:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process webhook',
      },
      { status: 500 }
    );
  }
}
