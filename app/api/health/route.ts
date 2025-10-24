import { NextResponse } from 'next/server';

// Health check endpoint for Docker healthcheck
export async function GET() {
  try {
    // Basic health check - verify API is responding
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'calling-agent-dashboard',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Service check failed',
      },
      { status: 503 }
    );
  }
}
