import { NextRequest, NextResponse } from 'next/server';
import {
  createKnowledgeBaseEntry,
  getAllKnowledgeBaseEntries,
} from '@/lib/firebase/knowledgeBase';
import { upsertKnowledgeBase } from '@/lib/pinecone/operations';
import { CreateKnowledgeBaseEntryInput } from '@/lib/types';

// GET /api/knowledge-base/entries - Get all entries
export async function GET() {
  try {
    const entries = await getAllKnowledgeBaseEntries();

    return NextResponse.json({
      success: true,
      data: entries,
    });
  } catch (error: any) {
    console.error('Error fetching knowledge base entries:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch knowledge base entries',
      },
      { status: 500 }
    );
  }
}

// POST /api/knowledge-base/entries - Create new entry
export async function POST(request: NextRequest) {
  try {
    const body: CreateKnowledgeBaseEntryInput = await request.json();

    // Validate required fields
    if (!body.question || !body.answer || !body.type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Question, answer, and type are required',
        },
        { status: 400 }
      );
    }

    // Create in Firebase
    const entry = await createKnowledgeBaseEntry(body);

    // Upsert to Pinecone
    try {
      await upsertKnowledgeBase({
        id: entry.id,
        question: entry.question,
        answer: entry.answer,
        type: entry.type,
        tags: entry.tags,
        isActive: entry.isActive,
      });
    } catch (pineconeError) {
      console.error('Error upserting to Pinecone:', pineconeError);
      // Continue even if Pinecone fails - entry is in Firebase
    }

    return NextResponse.json({
      success: true,
      data: entry,
      message: 'Knowledge base entry created successfully',
    });
  } catch (error: any) {
    console.error('Error creating knowledge base entry:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create knowledge base entry',
      },
      { status: 500 }
    );
  }
}
