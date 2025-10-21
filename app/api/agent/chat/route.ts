import { NextRequest, NextResponse } from 'next/server';
import { createGeminiAgent } from '@/lib/agent/gemini';
import { escalateToSupervisor, searchKnowledgeBase } from '@/lib/agent/tools';

// In-memory storage for demo purposes (use Redis/DB in production)
const agents = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, callerPhone, callerName } = body;

    if (!message || !sessionId || !callerPhone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: message, sessionId, callerPhone',
        },
        { status: 400 }
      );
    }

    // Get or create agent for this session
    let agent = agents.get(sessionId);
    if (!agent) {
      agent = createGeminiAgent();
      agents.set(sessionId, agent);
    }

    // First, check if we have this in the knowledge base
    const kbAnswer = await agent.searchKnowledgeForAnswer(message);

    if (kbAnswer) {
      // Found in knowledge base
      const response = await agent.chat(`Answer this using the knowledge base answer: ${message}\n\nKnowledge Base Answer: ${kbAnswer}`);

      return NextResponse.json({
        success: true,
        data: {
          response: response.text,
          source: 'knowledge_base',
          escalated: false,
        },
      });
    }

    // Check if we should escalate
    const shouldEscalate = await agent.shouldEscalate(message);

    if (shouldEscalate) {
      // Escalate to supervisor
      const escalationResult = await escalateToSupervisor(
        {
          question: message,
          context: `Session ${sessionId}`,
        },
        {
          phone: callerPhone,
          name: callerName,
          sessionId,
        }
      );

      return NextResponse.json({
        success: true,
        data: {
          response: `Let me check with my supervisor and get back to you. ${escalationResult}`,
          source: 'escalation',
          escalated: true,
        },
      });
    }

    // Normal conversation
    const response = await agent.chat(message, {
      name: callerName,
      phone: callerPhone,
    });

    return NextResponse.json({
      success: true,
      data: {
        response: response.text,
        source: 'agent',
        escalated: false,
      },
    });
  } catch (error) {
    console.error('Error in agent chat:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process chat message',
      },
      { status: 500 }
    );
  }
}

// Optional: Clear session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId && agents.has(sessionId)) {
      agents.delete(sessionId);
      return NextResponse.json({
        success: true,
        message: 'Session cleared',
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Session not found',
    }, { status: 404 });
  } catch (error) {
    console.error('Error clearing session:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear session',
      },
      { status: 500 }
    );
  }
}
