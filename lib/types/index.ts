import { Timestamp } from 'firebase/firestore';

// Help Request Types
export type HelpRequestStatus = 'pending' | 'resolved' | 'unresolved';

export interface HelpRequest {
  id: string;
  question: string;
  callerPhone: string;
  callerName?: string;
  status: HelpRequestStatus;
  createdAt: Timestamp | string; // Timestamp in DB, string when serialized for API
  resolvedAt?: Timestamp | string;
  supervisorResponse?: string;
  timeout?: boolean;
  sessionId?: string;
  context?: string; // Additional context from the conversation
}

export interface CreateHelpRequestInput {
  question: string;
  callerPhone: string;
  callerName?: string;
  sessionId?: string;
  context?: string;
}

export interface ResolveHelpRequestInput {
  requestId: string;
  supervisorResponse: string;
}

// Knowledge Base Types
export type KnowledgeBaseEntryType = 'business_context' | 'learned_answer';

export interface KnowledgeBaseEntry {
  id: string;
  question: string;
  answer: string;
  type: KnowledgeBaseEntryType;
  createdAt: Timestamp | string; // Timestamp in DB, string when serialized for API
  updatedAt?: Timestamp | string;
  learnedFromRequestId?: string;
  tags: string[];
  variations?: string[]; // Question variations for better matching
  pineconeId?: string; // Reference to Pinecone vector ID
  isActive: boolean; // Enable/disable entry
  usageCount?: number; // Track how often this is used
  lastUsedAt?: Timestamp | string;
}

export interface CreateKnowledgeBaseEntryInput {
  question: string;
  answer: string;
  type: KnowledgeBaseEntryType;
  learnedFromRequestId?: string;
  tags?: string[];
  variations?: string[];
  isActive?: boolean;
}

export interface UpdateKnowledgeBaseEntryInput {
  question?: string;
  answer?: string;
  tags?: string[];
  variations?: string[];
  isActive?: boolean;
}

export interface SearchKnowledgeBaseResult {
  entry: KnowledgeBaseEntry;
  score: number; // Similarity score from Pinecone (0-1)
  metadata?: Record<string, any>;
}

// Call Session Types
export type CallSessionStatus = 'active' | 'completed' | 'failed' | 'escalated';

export interface CallSession {
  id: string;
  callerPhone: string;
  callerName?: string;
  startTime: Timestamp | string; // Timestamp in DB, string when serialized for API
  endTime?: Timestamp | string;
  status: CallSessionStatus;
  helpRequestIds: string[];
  transcript?: string;
  livekitRoomName?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Webhook Types
export interface SupervisorNotificationPayload {
  requestId: string;
  question: string;
  callerPhone: string;
  callerName?: string;
  context?: string;
  timestamp: string;
}

export interface CallerFollowupPayload {
  requestId: string;
  callerPhone: string;
  supervisorResponse: string;
  timestamp: string;
}

// Firestore Document Data Types (without Timestamp conversion)
export type HelpRequestDoc = Omit<HelpRequest, 'createdAt' | 'resolvedAt'> & {
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
};

export type KnowledgeBaseEntryDoc = Omit<KnowledgeBaseEntry, 'createdAt'> & {
  createdAt: Timestamp;
};

export type CallSessionDoc = Omit<CallSession, 'startTime' | 'endTime'> & {
  startTime: Timestamp;
  endTime?: Timestamp;
};
