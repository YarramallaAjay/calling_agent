import { NextResponse } from 'next/server';
import { getPendingHelpRequests } from '@/lib/firebase/helpRequests';
import { serializeHelpRequest } from '@/lib/firebase/serialize';

export async function GET() {
  try {
    const requests = await getPendingHelpRequests();

    // Serialize Firestore Timestamps to ISO strings for JSON response
    const serializedRequests = requests.map(serializeHelpRequest);

    return NextResponse.json({
      success: true,
      data: serializedRequests,
    });
  } catch (error) {
    console.error('Error fetching pending help requests:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pending help requests',
      },
      { status: 500 }
    );
  }
}
