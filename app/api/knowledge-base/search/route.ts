import { NextRequest, NextResponse } from 'next/server';
import { searchKnowledgeBase, getConfidenceLevel } from '@/lib/pinecone/operations';
import { incrementUsageCount } from '@/lib/firebase/knowledgeBase';

export async function POST(request: NextRequest) {
  try {
    const { query, topK = 3, filterTags } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Query is required and must be a string',
        },
        { status: 400 }
      );
    }

    // Build filter for Pinecone
    const filter: Record<string, any> = { isActive: true };
    if (filterTags && Array.isArray(filterTags) && filterTags.length > 0) {
      filter.tags = { $in: filterTags };
    }

    // Search in Pinecone
    const results = await searchKnowledgeBase(query, {
      topK,
      filter,
      includeMetadata: true,
    });

    // Add confidence level to results
    const enrichedResults = results.map((result) => ({
      ...result,
      confidence: getConfidenceLevel(result.score),
    }));

    // Track usage for top result if score is high enough
    if (enrichedResults.length > 0 && enrichedResults[0].score >= 0.70) {
      try {
        await incrementUsageCount(enrichedResults[0].entry.id);
      } catch (error) {
        console.error('Error incrementing usage count:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        query,
        results: enrichedResults,
        topResult: enrichedResults[0] || null,
      },
    });
  } catch (error: any) {
    console.error('Error searching knowledge base:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to search knowledge base',
      },
      { status: 500 }
    );
  }
}
