import { NextRequest, NextResponse } from 'next/server';
import { resolveHelpRequest } from '@/lib/firebase/helpRequests';
import { createKnowledgeBaseEntry } from '@/lib/firebase/knowledgeBase';
import { serializeHelpRequest } from '@/lib/firebase/serialize';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log(`📥 Resolving help request ${id} with response: "${body.supervisorResponse?.substring(0, 50)}..."`);

    if (!body.supervisorResponse) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: supervisorResponse',
        },
        { status: 400 }
      );
    }

    // Resolve the help request
    const helpRequest = await resolveHelpRequest(id, body.supervisorResponse);

    console.log(`✅ Help request ${id} resolved successfully. Status: ${helpRequest.status}`);

    // Add to knowledge base
    await createKnowledgeBaseEntry({
      question: helpRequest.question,
      answer: body.supervisorResponse,
      learnedFromRequestId: id,
      tags: body.tags || [],
    });

    // Trigger caller follow-up webhook
    try {
      const followupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/caller-followup`;
      await fetch(followupUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: id,
          callerPhone: helpRequest.callerPhone,
          supervisorResponse: body.supervisorResponse,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (webhookError) {
      console.error('Error calling followup webhook:', webhookError);
      // Continue even if webhook fails
    }

    return NextResponse.json({
      success: true,
      data: serializeHelpRequest(helpRequest),
      message: 'Help request resolved and added to knowledge base',
    });
  } catch (error) {
    console.error('Error resolving help request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to resolve help request',
      },
      { status: 500 }
    );
  }
}
