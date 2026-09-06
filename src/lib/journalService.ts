import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db, stripUndefined } from './firebase';
import type { JournalEntry, JournalMessage, WeeklyDigest, UserProfile } from '../types';

// Ensure user profile document exists
export async function syncUserProfile(profile: UserProfile): Promise<void> {
  if (!profile.uid) return;
  const userRef = doc(db, 'users', profile.uid, 'profile', 'info');
  const sanitized = stripUndefined({
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    lastLoginAt: new Date().toISOString(),
  });
  await setDoc(userRef, sanitized, { merge: true });
}

// Fetch all journal entries for the authenticated user
export async function fetchUserEntries(userId: string): Promise<JournalEntry[]> {
  if (!userId) return [];
  const entriesRef = collection(db, 'users', userId, 'entries');
  const q = query(entriesRef, orderBy('updatedAt', 'desc'));
  
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const meta = data.metadata || {};
      return {
        id: docSnap.id,
        title: meta.title || data.title || 'Untitled Reflection',
        createdAt: meta.createdAt || data.createdAt || new Date().toISOString(),
        updatedAt: meta.updatedAt || data.updatedAt || new Date().toISOString(),
        mood: meta.mood || data.mood || 'Reflective',
        tags: Array.isArray(meta.tags) ? meta.tags : (Array.isArray(data.tags) ? data.tags : []),
        summary: meta.summary || data.summary || '',
        messageCount: data.messageCount || 0,
      };
    });
  } catch (err) {
    // If composite index is pending, fallback to un-ordered fetch and sort in-memory
    console.warn('Fallback ordering for entries fetch:', err);
    const snapshot = await getDocs(entriesRef);
    const list = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const meta = data.metadata || {};
      return {
        id: docSnap.id,
        title: meta.title || data.title || 'Untitled Reflection',
        createdAt: meta.createdAt || data.createdAt || new Date().toISOString(),
        updatedAt: meta.updatedAt || data.updatedAt || new Date().toISOString(),
        mood: meta.mood || data.mood || 'Reflective',
        tags: Array.isArray(meta.tags) ? meta.tags : (Array.isArray(data.tags) ? data.tags : []),
        summary: meta.summary || data.summary || '',
        messageCount: data.messageCount || 0,
      };
    });
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}

// Create a new reflection session
export async function createJournalEntry(
  userId: string,
  initialTitle?: string
): Promise<JournalEntry> {
  const entriesRef = collection(db, 'users', userId, 'entries');
  const newEntryDoc = doc(entriesRef);
  const now = new Date().toISOString();

  const metadata = {
    title: initialTitle || 'New Reflection',
    createdAt: now,
    updatedAt: now,
    mood: 'Open',
    tags: ['reflection'],
    summary: 'Starting a new reflective dialogue...',
  };

  const payload = stripUndefined({
    metadata,
    title: metadata.title,
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
    mood: metadata.mood,
    tags: metadata.tags,
    summary: metadata.summary,
    messageCount: 0,
  });

  await setDoc(newEntryDoc, payload);

  return {
    id: newEntryDoc.id,
    ...metadata,
    messageCount: 0,
  };
}

// Update entry metadata
export async function updateEntryMetadata(
  userId: string,
  entryId: string,
  updates: {
    title?: string;
    mood?: string;
    tags?: string[];
    summary?: string;
  }
): Promise<void> {
  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  const now = new Date().toISOString();

  const cleanUpdates = stripUndefined({
    updatedAt: now,
    ...(updates.title !== undefined ? { title: updates.title } : {}),
    ...(updates.mood !== undefined ? { mood: updates.mood } : {}),
    ...(updates.tags !== undefined ? { tags: updates.tags } : {}),
    ...(updates.summary !== undefined ? { summary: updates.summary } : {}),
    metadata: stripUndefined({
      updatedAt: now,
      ...(updates.title !== undefined ? { title: updates.title } : {}),
      ...(updates.mood !== undefined ? { mood: updates.mood } : {}),
      ...(updates.tags !== undefined ? { tags: updates.tags } : {}),
      ...(updates.summary !== undefined ? { summary: updates.summary } : {}),
    }),
  });

  await setDoc(entryRef, cleanUpdates, { merge: true });
}

// Delete an entry and its messages
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  const messagesRef = collection(db, 'users', userId, 'entries', entryId, 'messages');
  const msgSnap = await getDocs(messagesRef);
  for (const m of msgSnap.docs) {
    await deleteDoc(m.ref);
  }
  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  await deleteDoc(entryRef);
}

// Fetch all messages for an entry
export async function fetchEntryMessages(
  userId: string,
  entryId: string
): Promise<JournalMessage[]> {
  const messagesRef = collection(db, 'users', userId, 'entries', entryId, 'messages');
  try {
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
      const data = d.data();
      let isoTime = new Date().toISOString();
      if (data.timestamp instanceof Timestamp) {
        isoTime = data.timestamp.toDate().toISOString();
      } else if (typeof data.timestamp === 'string') {
        isoTime = data.timestamp;
      }
      const role: 'user' | 'model' = data.role === 'model' ? 'model' : 'user';
      return {
        id: d.id,
        role,
        content: data.content || '',
        timestamp: isoTime,
      };
    });
  } catch (err) {
    console.warn('Fallback ordering for messages fetch:', err);
    const snapshot = await getDocs(messagesRef);
    const list: JournalMessage[] = snapshot.docs.map(d => {
      const data = d.data();
      let isoTime = new Date().toISOString();
      if (data.timestamp instanceof Timestamp) {
        isoTime = data.timestamp.toDate().toISOString();
      } else if (typeof data.timestamp === 'string') {
        isoTime = data.timestamp;
      }
      const role: 'user' | 'model' = data.role === 'model' ? 'model' : 'user';
      return {
        id: d.id,
        role,
        content: data.content || '',
        timestamp: isoTime,
      };
    });
    return list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}

// Append a message to an entry with guaranteed transaction write
export async function addJournalMessage(
  userId: string,
  entryId: string,
  message: { role: 'user' | 'model'; content: string; timestamp?: string }
): Promise<JournalMessage> {
  const messagesRef = collection(db, 'users', userId, 'entries', entryId, 'messages');
  const newMsgDoc = doc(messagesRef);
  const isoTime = message.timestamp || new Date().toISOString();

  const payload = stripUndefined({
    role: message.role,
    content: message.content,
    timestamp: isoTime,
  });

  await setDoc(newMsgDoc, payload);

  // Update entry timestamp and message count
  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  await setDoc(
    entryRef,
    {
      updatedAt: isoTime,
      'metadata.updatedAt': isoTime,
    },
    { merge: true }
  );

  return {
    id: newMsgDoc.id,
    role: message.role,
    content: message.content,
    timestamp: isoTime,
  };
}

// Save Weekly Digest
export async function saveWeeklyDigest(userId: string, digest: WeeklyDigest): Promise<string> {
  const digestsRef = collection(db, 'users', userId, 'digests');
  const newDoc = doc(digestsRef);
  const now = new Date().toISOString();

  const payload = stripUndefined({
    ...digest,
    id: newDoc.id,
    createdAt: now,
  });

  await setDoc(newDoc, payload);
  return newDoc.id;
}

// Fetch all Weekly Digests
export async function fetchWeeklyDigests(userId: string): Promise<WeeklyDigest[]> {
  const digestsRef = collection(db, 'users', userId, 'digests');
  try {
    const q = query(digestsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ ...(d.data() as WeeklyDigest), id: d.id }));
  } catch (err) {
    const snapshot = await getDocs(digestsRef);
    const list = snapshot.docs.map(d => ({ ...(d.data() as WeeklyDigest), id: d.id }));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
