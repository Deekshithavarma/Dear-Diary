export type MessageRole = 'user' | 'model';

export interface JournalMessage {
  id?: string;
  role: MessageRole;
  content: string;
  timestamp: string; // ISO string for robust JSON/Firestore compatibility
}

export interface EntryMetadata {
  title: string;
  createdAt: string;
  updatedAt: string;
  mood?: string;
  tags?: string[];
  summary?: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  mood?: string;
  tags?: string[];
  summary?: string;
  messageCount?: number;
}

export interface WeeklyDigest {
  id?: string;
  period: string;
  headline: string;
  primaryMoodLandscape: string;
  recurringThemes: string[];
  breakthroughsAndGrowth: string;
  tensionsAndFriction: string;
  gentleInquiriesForNextWeek: string[];
  digestMarkdown: string;
  createdAt: string;
  entriesAnalyzedCount?: number;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt?: string;
  lastLoginAt?: string;
}
