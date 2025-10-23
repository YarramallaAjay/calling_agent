import { NextRequest, NextResponse } from 'next/server';
import {
  getKnowledgeBaseEntry,
  updateKnowledgeBaseEntry,
  deleteKnowledgeBaseEntry,
} from '@/lib/firebase/knowledgeBase';
import { upsertKnowledgeBase, deleteKnowledgeBase } from '@/lib/pinecone/operations';
import { UpdateKnowledgeBaseEntryInput } from '@/lib/types';

// GET /api/knowledge-base/entries/[id] - Get single entry
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entry = await getKnowledgeBaseEntry(params.id);

    if (!entry) {
      return NextResponse.json(
        {
          success: false,
          error: 'Knowledge base entry not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: entry,
    });
  } catch (error: any) {
    console.error('Error fetching knowledge base entry:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch knowledge base entry',
      },
      { status: 500 }
    );
  }
}

// PUT /api/knowledge-base/entries/[id] - Update entry
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdateKnowledgeBaseEntryInput = await request.json();

    // Update in Firebase
    const updatedEntry = await updateKnowledgeBaseEntry(params.id, body);

    // Update in Pinecone if question or answer changed
    if (body.question || body.answer) {
      try {
        await upsertKnowledgeBase({
          id: updatedEntry.id,
          question: updatedEntry.question,
          answer: updatedEntry.answer,
          type: updatedEntry.type,
          tags: updatedEntry.tags,
          isActive: updatedEntry.isActive,
        });
      } catch (pineconeError) {
        console.error('Error updating in Pinecone:', pineconeError);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedEntry,
      message: 'Knowledge base entry updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating knowledge base entry:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update knowledge base entry',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/knowledge-base/entries/[id] - Delete entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Delete from Firebase
    await deleteKnowledgeBaseEntry(params.id);

    // Delete from Pinecone
    try {
      await deleteKnowledgeBase(params.id);
    } catch (pineconeError) {
      console.error('Error deleting from Pinecone:', pineconeError);
    }

    return NextResponse.json({
      success: true,
      message: 'Knowledge base entry deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting knowledge base entry:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete knowledge base entry',
      },
      { status: 500 }
    );
  }
}
