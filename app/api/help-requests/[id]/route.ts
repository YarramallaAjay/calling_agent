import { NextRequest, NextResponse } from 'next/server';
import { getHelpRequest } from '@/lib/firebase/helpRequests';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const helpRequest = await getHelpRequest(id);

    if (!helpRequest) {
      return NextResponse.json(
        {
          success: false,
          error: 'Help request not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: helpRequest,
    });
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
