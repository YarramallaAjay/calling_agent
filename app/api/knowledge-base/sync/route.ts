import { NextResponse } from 'next/server';
import { getAllKnowledgeBaseEntries } from '@/lib/firebase/knowledgeBase';
import { batchUpsertKnowledgeBase } from '@/lib/pinecone/operations';

// POST /api/knowledge-base/sync - Sync Firebase to Pinecone
export async function POST() {
  try {
    console.log('Starting sync from Firebase to Pinecone...');

    // Get all entries from Firebase
    const entries = await getAllKnowledgeBaseEntries();

    if (entries.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No entries to sync',
        count: 0,
      });
    }

    // Prepare entries for Pinecone
    const pineconeEntries = entries.map((entry) => ({
      id: entry.id,
      question: entry.question,
      answer: entry.answer,
      type: entry.type,
      tags: entry.tags,
      isActive: entry.isActive,
    }));

    // Batch upsert to Pinecone
    await batchUpsertKnowledgeBase(pineconeEntries);

    console.log(`Successfully synced ${entries.length} entries to Pinecone`);

    return NextResponse.json({
      success: true,
      message: 'Successfully synced entries to Pinecone',
      count: entries.length,
    });
  } catch (error: any) {
    console.error('Error syncing to Pinecone:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to sync to Pinecone',
      },
      { status: 500 }
    );
  }
}
