import { Timestamp } from 'firebase/firestore';

// Help Request Types
export type HelpRequestStatus = 'pending' | 'resolved' | 'unresolved';

export interface HelpRequest {
  id: string;
  question: string;
  callerPhone: string;
  callerName?: string;
  status: HelpRequestStatus;
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
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
export interface KnowledgeBaseEntry {
  id: string;
  question: string;
  answer: string;
  createdAt: Timestamp;
  learnedFromRequestId?: string;
  tags: string[];
  variations?: string[]; // Question variations for better matching
}

export interface CreateKnowledgeBaseEntryInput {
  question: string;
  answer: string;
  learnedFromRequestId?: string;
  tags?: string[];
  variations?: string[];
}

// Call Session Types
export type CallSessionStatus = 'active' | 'completed' | 'failed' | 'escalated';

export interface CallSession {
  id: string;
  callerPhone: string;
  callerName?: string;
  startTime: Timestamp;
  endTime?: Timestamp;
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
