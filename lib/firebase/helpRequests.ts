import { adminDb } from './admin';
import {
  HelpRequest,
  CreateHelpRequestInput,
  HelpRequestStatus,
} from '../types';
import { FieldValue } from 'firebase-admin/firestore';

const COLLECTION_NAME = 'helpRequests';

export async function createHelpRequest(
  input: CreateHelpRequestInput
): Promise<HelpRequest> {
  const docRef = adminDb.collection(COLLECTION_NAME).doc();

  const helpRequest: Omit<HelpRequest, 'id'> = {
    question: input.question,
    callerPhone: input.callerPhone,
    callerName: input.callerName,
    status: 'pending' as HelpRequestStatus,
    createdAt: FieldValue.serverTimestamp() as any,
    sessionId: input.sessionId,
    context: input.context,
  };

  await docRef.set(helpRequest);

  const doc = await docRef.get();
  return {
    id: doc.id,
    ...doc.data(),
  } as HelpRequest;
}

export async function getHelpRequest(id: string): Promise<HelpRequest | null> {
  const doc = await adminDb.collection(COLLECTION_NAME).doc(id).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  } as HelpRequest;
}

export async function getAllHelpRequests(): Promise<HelpRequest[]> {
  const snapshot = await adminDb
    .collection(COLLECTION_NAME)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as HelpRequest[];
}

export async function getPendingHelpRequests(): Promise<HelpRequest[]> {
  const snapshot = await adminDb
    .collection(COLLECTION_NAME)
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'asc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as HelpRequest[];
}

export async function resolveHelpRequest(
  requestId: string,
  supervisorResponse: string
): Promise<HelpRequest> {
  const docRef = adminDb.collection(COLLECTION_NAME).doc(requestId);

  await docRef.update({
    status: 'resolved',
    supervisorResponse,
    resolvedAt: FieldValue.serverTimestamp(),
  });

  const doc = await docRef.get();
  return {
    id: doc.id,
    ...doc.data(),
  } as HelpRequest;
}

export async function markAsUnresolved(requestId: string): Promise<void> {
  await adminDb.collection(COLLECTION_NAME).doc(requestId).update({
    status: 'unresolved',
    timeout: true,
  });
}

export async function markTimedOutRequests(timeoutHours: number = 24): Promise<number> {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - timeoutHours);

  const snapshot = await adminDb
    .collection(COLLECTION_NAME)
    .where('status', '==', 'pending')
    .where('createdAt', '<', cutoffTime)
    .get();

  const batch = adminDb.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: 'unresolved',
      timeout: true,
    });
  });

  await batch.commit();
  return snapshot.size;
}
