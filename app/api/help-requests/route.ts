import { NextRequest, NextResponse } from 'next/server';
import {
  createHelpRequest,
  getAllHelpRequests,
} from '@/lib/firebase/helpRequests';
import { CreateHelpRequestInput } from '@/lib/types';
import { serializeHelpRequest } from '@/lib/firebase/serialize';

export async function GET() {
  try {
    const requests = await getAllHelpRequests();
    const serializedRequests = requests.map(serializeHelpRequest);
    return NextResponse.json({
      success: true,
      data: serializedRequests,
    });
  } catch (error) {
    console.error('Error fetching help requests:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch help requests',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateHelpRequestInput = await request.json();

    // Validation
    if (!body.question || !body.callerPhone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: question and callerPhone',
        },
        { status: 400 }
      );
    }

    const helpRequest = await createHelpRequest(body);

    // Trigger supervisor notification webhook
    try {
      const webhookUrl = process.env.SUPERVISOR_WEBHOOK_URL || '';
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: helpRequest.id,
          question: helpRequest.question,
          callerPhone: helpRequest.callerPhone,
          callerName: helpRequest.callerName,
          context: helpRequest.context,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (webhookError) {
      console.error('Error calling supervisor webhook:', webhookError);
      // Continue even if webhook fails
    }

    return NextResponse.json(
      {
        success: true,
        data: serializeHelpRequest(helpRequest),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating help request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create help request',
      },
      { status: 500 }
    );
  }
}
