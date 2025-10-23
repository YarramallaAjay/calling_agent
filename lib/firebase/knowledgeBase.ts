import { adminDb } from './admin';
import {
  KnowledgeBaseEntry,
  CreateKnowledgeBaseEntryInput,
} from '../types';
import { FieldValue } from 'firebase-admin/firestore';

const COLLECTION_NAME = 'knowledgeBase';

export async function createKnowledgeBaseEntry(
  input: CreateKnowledgeBaseEntryInput
): Promise<KnowledgeBaseEntry> {
  const docRef = adminDb.collection(COLLECTION_NAME).doc();

  const entry: Omit<KnowledgeBaseEntry, 'id'> = {
    question: input.question,
    answer: input.answer,
    type: input.type,
    createdAt: FieldValue.serverTimestamp() as any,
    updatedAt: FieldValue.serverTimestamp() as any,
    learnedFromRequestId: input.learnedFromRequestId|| "",
    tags: input.tags || [],
    variations: input.variations || [],
    isActive: input.isActive !== undefined ? input.isActive : true,
    usageCount: 0,
  };

  await docRef.set(entry);

  const doc = await docRef.get();
  return {
    id: doc.id,
    ...doc.data(),
  } as KnowledgeBaseEntry;
}

export async function getKnowledgeBaseEntry(
  id: string
): Promise<KnowledgeBaseEntry | null> {
  const doc = await adminDb.collection(COLLECTION_NAME).doc(id).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  } as KnowledgeBaseEntry;
}

export async function getAllKnowledgeBaseEntries(): Promise<KnowledgeBaseEntry[]> {
  const snapshot = await adminDb
    .collection(COLLECTION_NAME)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as KnowledgeBaseEntry[];
}

export async function searchKnowledgeBase(query: string): Promise<KnowledgeBaseEntry | null> {
  const normalizedQuery = query.toLowerCase().trim();

  // Get all entries (for MVP, we'll do client-side filtering)
  // In production, use vector embeddings or Algolia for better search
  const snapshot = await adminDb.collection(COLLECTION_NAME).get();

  const entries = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as KnowledgeBaseEntry[];

  // Simple fuzzy matching
  for (const entry of entries) {
    const normalizedQuestion = entry.question.toLowerCase().trim();

    // Exact match
    if (normalizedQuestion === normalizedQuery) {
      return entry;
    }

    // Check variations
    if (entry.variations) {
      for (const variation of entry.variations) {
        if (variation.toLowerCase().trim() === normalizedQuery) {
          return entry;
        }
      }
    }

    // Partial match (contains)
    if (
      normalizedQuestion.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedQuestion)
    ) {
      return entry;
    }
  }

  // Check for keyword matches
  const queryWords = normalizedQuery.split(' ');
  for (const entry of entries) {
    const entryWords = entry.question.toLowerCase().split(' ');
    const matchCount = queryWords.filter((word) =>
      entryWords.some((entryWord) => entryWord.includes(word) || word.includes(entryWord))
    ).length;

    // If more than 50% of words match, consider it a match
    if (matchCount / queryWords.length > 0.5) {
      return entry;
    }
  }

  return null;
}

export async function updateKnowledgeBaseEntry(
  id: string,
  updates: Partial<Omit<KnowledgeBaseEntry, 'id' | 'createdAt'>>
): Promise<KnowledgeBaseEntry> {
  const docRef = adminDb.collection(COLLECTION_NAME).doc(id);

  const updateData = {
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await docRef.update(updateData);

  const doc = await docRef.get();
  return {
    id: doc.id,
    ...doc.data(),
  } as KnowledgeBaseEntry;
}

export async function incrementUsageCount(id: string): Promise<void> {
  const docRef = adminDb.collection(COLLECTION_NAME).doc(id);

  await docRef.update({
    usageCount: FieldValue.increment(1),
    lastUsedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteKnowledgeBaseEntry(id: string): Promise<void> {
  await adminDb.collection(COLLECTION_NAME).doc(id).delete();
}
