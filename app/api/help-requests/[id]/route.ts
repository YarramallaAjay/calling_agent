import { NextRequest, NextResponse } from 'next/server';
import { getHelpRequest } from '@/lib/firebase/helpRequests';
import { serializeHelpRequest } from '@/lib/firebase/serialize';

// Disable caching for real-time polling
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const helpRequest = await getHelpRequest(id);

    if (!helpRequest) {
      console.log(`[ERROR] Help request ${id} not found`);
      return NextResponse.json(
        {
          success: false,
          error: 'Help request not found',
        },
        { status: 404 }
      );
    }

    console.log(`📤 Returning help request ${id}: status=${helpRequest.status}, hasResponse=${!!helpRequest.supervisorResponse}`);

    const response = NextResponse.json({
      success: true,
      data: serializeHelpRequest(helpRequest),
    });

    // Add cache-control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching help request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch help request',
      },
      { status: 500 }
    );
  }
}
