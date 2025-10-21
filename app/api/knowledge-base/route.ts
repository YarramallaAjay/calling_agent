import { NextRequest, NextResponse } from 'next/server';
import {
  createKnowledgeBaseEntry,
  getAllKnowledgeBaseEntries,
} from '@/lib/firebase/knowledgeBase';
import { CreateKnowledgeBaseEntryInput } from '@/lib/types';

export async function GET() {
  try {
    const entries = await getAllKnowledgeBaseEntries();
    return NextResponse.json({
      success: true,
      data: entries,
    });
  } catch (error) {
    console.error('Error fetching knowledge base entries:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch knowledge base entries',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateKnowledgeBaseEntryInput = await request.json();

    // Validation
    if (!body.question || !body.answer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: question and answer',
        },
        { status: 400 }
      );
    }

    const entry = await createKnowledgeBaseEntry(body);

    return NextResponse.json(
      {
        success: true,
        data: entry,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating knowledge base entry:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create knowledge base entry',
      },
      { status: 500 }
    );
  }
}
