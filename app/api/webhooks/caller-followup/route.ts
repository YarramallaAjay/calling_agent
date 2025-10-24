import { NextRequest, NextResponse } from 'next/server';
import { CallerFollowupPayload } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const payload: CallerFollowupPayload = await request.json();

    // Log the follow-up (simulating sending a text back to the caller)
    console.log('\n📞 CALLER FOLLOW-UP 📞');
    console.log('═'.repeat(50));
    console.log(`Request ID: ${payload.requestId}`);
    console.log(`Caller: ${payload.callerPhone}`);
    console.log(`Response: ${payload.supervisorResponse}`);
    console.log(`Time: ${payload.timestamp}`);
    console.log('═'.repeat(50));
    console.log(`[SMS] Sending to ${payload.callerPhone}:`);
    console.log(`   "Hi! I checked with my supervisor."`);
    console.log(`   "${payload.supervisorResponse}"`);
    console.log(`   "Thanks for your patience!"\n`);

    // In a real implementation, this would send an actual SMS via Twilio
    // back to the caller

    return NextResponse.json({
      success: true,
      message: 'Caller follow-up sent successfully',
    });
  } catch (error) {
    console.error('Error processing caller follow-up:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send caller follow-up',
      },
      { status: 500 }
    );
  }
}
