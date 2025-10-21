import { NextRequest, NextResponse } from 'next/server';
import { searchKnowledgeBase } from '@/lib/firebase/knowledgeBase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing query parameter: q',
        },
        { status: 400 }
      );
    }

    const result = await searchKnowledgeBase(query);

    return NextResponse.json({
      success: true,
      data: result,
      found: result !== null,
    });
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search knowledge base',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: query',
        },
        { status: 400 }
      );
    }

    const result = await searchKnowledgeBase(query);

    return NextResponse.json({
      success: true,
      data: result,
      found: result !== null,
    });
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search knowledge base',
      },
      { status: 500 }
    );
  }
}
