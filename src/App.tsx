import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import {
  subscribeToAuth,
  signInWithGoogle,
  logOut,
} from './lib/firebase';
import {
  syncUserProfile,
  fetchUserEntries,
  createJournalEntry,
  updateEntryMetadata,
  deleteJournalEntry,
  fetchEntryMessages,
  addJournalMessage,
  saveWeeklyDigest,
  fetchWeeklyDigests,
} from './lib/journalService';
import type {
  UserProfile,
  JournalEntry,
  JournalMessage,
  WeeklyDigest,
} from './types';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ActiveJournal } from './components/ActiveJournal';
import { WeeklyDigestModal } from './components/WeeklyDigestModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Journal State
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState<boolean>(false);

  // Streaming State
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [journalError, setJournalError] = useState<string | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);

  // Weekly Digest State
  const [isDigestOpen, setIsDigestOpen] = useState<boolean>(false);
  const [savedDigests, setSavedDigests] = useState<WeeklyDigest[]>([]);
  const [isGeneratingDigest, setIsGeneratingDigest] = useState<boolean>(false);

  // Mobile navigation
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isCreatingEntry, setIsCreatingEntry] = useState<boolean>(false);

  // 1. Subscribe to Firebase Auth
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (user: User | null) => {
      setIsAuthLoading(true);
      if (user) {
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        };
        setCurrentUser(profile);
        try {
          await syncUserProfile(profile);
        } catch (err) {
          console.warn('Failed to sync user profile:', err);
        }
      } else {
        setCurrentUser(null);
        setEntries([]);
        setActiveEntryId(null);
        setMessages([]);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Load User Entries & Digests upon login
  const loadUserEntries = useCallback(async (userId: string) => {
    try {
      const userEntries = await fetchUserEntries(userId);
      setEntries(userEntries);
      if (userEntries.length > 0 && !activeEntryId) {
        setActiveEntryId(userEntries[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching entries:', err);
      setJournalError('Unable to load entries. Check connection or Firestore configuration.');
    }
  }, [activeEntryId]);

  const loadDigests = useCallback(async (userId: string) => {
    try {
      const digests = await fetchWeeklyDigests(userId);
      setSavedDigests(digests);
    } catch (err) {
      console.warn('Error loading weekly digests:', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.uid) {
      loadUserEntries(currentUser.uid);
      loadDigests(currentUser.uid);
    }
  }, [currentUser?.uid, loadUserEntries, loadDigests]);

  // 3. Load Active Entry's Messages
  useEffect(() => {
    if (!currentUser?.uid || !activeEntryId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setIsMessagesLoading(true);
    setJournalError(null);

    fetchEntryMessages(currentUser.uid, activeEntryId)
      .then(msgs => {
        if (isMounted) {
          setMessages(msgs);
        }
      })
      .catch(err => {
        console.error('Error fetching messages:', err);
        if (isMounted) {
          setJournalError('Failed to load conversation history.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsMessagesLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid, activeEntryId]);

  // Handle Google Sign-In
  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setAuthError(
        err?.message || 'Google Sign-In failed. Please check browser permissions and try again.'
      );
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (err: any) {
      console.error('Sign-out failed:', err);
    }
  };

  // Create New Reflection
  const handleNewEntry = async () => {
    if (!currentUser?.uid || isCreatingEntry) return;
    setIsCreatingEntry(true);
    setJournalError(null);
    try {
      const newEntry = await createJournalEntry(currentUser.uid, 'Dear Diary Entry');
      setEntries(prev => [newEntry, ...prev]);
      setActiveEntryId(newEntry.id);
      setMessages([]);
    } catch (err: any) {
      console.error('Error creating entry:', err);
      setJournalError('Failed to start a new reflection.');
    } finally {
      setIsCreatingEntry(false);
    }
  };

  // Delete Entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!currentUser?.uid) return;
    try {
      await deleteJournalEntry(currentUser.uid, entryId);
      const remaining = entries.filter(e => e.id !== entryId);
      setEntries(remaining);
      if (activeEntryId === entryId) {
        setActiveEntryId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err: any) {
      console.error('Error deleting entry:', err);
      setJournalError('Failed to delete reflection.');
    }
  };

  // Update Title
  const handleUpdateTitle = async (newTitle: string) => {
    if (!currentUser?.uid || !activeEntryId) return;
    try {
      await updateEntryMetadata(currentUser.uid, activeEntryId, { title: newTitle });
      setEntries(prev =>
        prev.map(e => (e.id === activeEntryId ? { ...e, title: newTitle } : e))
      );
    } catch (err: any) {
      console.error('Failed to update title:', err);
      setJournalError('Could not save new title.');
    }
  };

  // Multi-Turn Journaling with Streaming & Structured Metadata
  const handleSendMessage = async (text: string) => {
    if (!currentUser?.uid) return;

    let targetEntryId = activeEntryId;

    // If no active entry exists, automatically create one first
    if (!targetEntryId) {
      try {
        const newEntry = await createJournalEntry(currentUser.uid, 'Reflective Session');
        setEntries(prev => [newEntry, ...prev]);
        setActiveEntryId(newEntry.id);
        targetEntryId = newEntry.id;
      } catch (createErr) {
        console.error('Failed to create entry before message:', createErr);
        setJournalError('Could not initialize session.');
        return;
      }
    }

    lastUserMessageRef.current = text;
    setJournalError(null);

    // 1. Optimistically display and persist user message to Firestore
    const userMsgTimestamp = new Date().toISOString();
    let persistedUserMsg: JournalMessage;
    try {
      persistedUserMsg = await addJournalMessage(currentUser.uid, targetEntryId, {
        role: 'user',
        content: text,
        timestamp: userMsgTimestamp,
      });
      setMessages(prev => [...prev, persistedUserMsg]);
    } catch (dbErr: any) {
      console.error('Failed to persist user message:', dbErr);
      setJournalError('Failed to save your reflection to Firestore. Please retry.');
      return;
    }

    // 2. Prepare conversation history for Gemini
    const currentEntry = entries.find(e => e.id === targetEntryId);
    const historyPayload = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    setIsStreaming(true);
    setStreamingText('');

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: historyPayload,
          message: text,
          currentTitle: currentEntry?.title || '',
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedAssistantText = '';
      let extractedMeta: any = null;
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          const trimmedBlock = block.trim();
          if (!trimmedBlock.startsWith('data:')) continue;
          const jsonString = trimmedBlock.replace(/^data:\s*/, '');
          try {
            const data = JSON.parse(jsonString);
            if (data.type === 'chunk' && data.text) {
              accumulatedAssistantText += data.text;
              setStreamingText(accumulatedAssistantText);
            } else if (data.type === 'metadata' && data.data) {
              extractedMeta = data.data;
            } else if (data.type === 'done') {
              if (data.fullText) accumulatedAssistantText = data.fullText;
            } else if (data.type === 'error') {
              throw new Error(data.error || 'Reflection stream error');
            }
          } catch (e: any) {
            console.warn('Error parsing SSE block:', e);
          }
        }
      }

      // 3. Persist Model Response to Firestore
      if (accumulatedAssistantText) {
        const assistantMsg = await addJournalMessage(currentUser.uid, targetEntryId, {
          role: 'model',
          content: accumulatedAssistantText,
        });
        setMessages(prev => [...prev, assistantMsg]);
      }

      // 4. Update entry with extracted structured metadata (mood, tags, TL;DR summary, title)
      if (extractedMeta) {
        const updates: Partial<JournalEntry> = {};
        if (extractedMeta.mood) updates.mood = extractedMeta.mood;
        if (Array.isArray(extractedMeta.tags)) updates.tags = extractedMeta.tags;
        if (extractedMeta.summary) updates.summary = extractedMeta.summary;
        if (
          extractedMeta.title &&
          (!currentEntry?.title || currentEntry.title === 'Reflective Session' || currentEntry.title === 'New Reflection')
        ) {
          updates.title = extractedMeta.title;
        }

        await updateEntryMetadata(currentUser.uid, targetEntryId, updates);

        // Update local entries list
        setEntries(prev =>
          prev.map(e => (e.id === targetEntryId ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e))
        );
      }
    } catch (streamErr: any) {
      console.error('Error during reflection generation/save:', streamErr);
      setJournalError('Connection issue while reflecting. Your words are safely stored.');
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  // Generate Weekly Digest
  const handleGenerateDigest = async (entriesToAnalyze: JournalEntry[]): Promise<WeeklyDigest> => {
    if (!currentUser?.uid) throw new Error('You must be signed in.');

    setIsGeneratingDigest(true);
    try {
      // Gather entry snippets with recent messages if available
      const payloadEntries = await Promise.all(
        entriesToAnalyze.map(async entry => {
          let recentMessages: JournalMessage[] = [];
          if (entry.id === activeEntryId && messages.length > 0) {
            recentMessages = messages;
          } else {
            try {
              recentMessages = await fetchEntryMessages(currentUser.uid, entry.id);
            } catch {
              recentMessages = [];
            }
          }
          return {
            id: entry.id,
            title: entry.title,
            updatedAt: entry.updatedAt,
            mood: entry.mood,
            tags: entry.tags,
            summary: entry.summary,
            messages: recentMessages.slice(-6), // last 6 exchanges
          };
        })
      );

      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: payloadEntries }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to synthesize reflections.');
      }

      const resData = await response.json();
      const digest: WeeklyDigest = resData.digest;

      // Persist Weekly Digest in Cloud Firestore
      const savedId = await saveWeeklyDigest(currentUser.uid, digest);
      const fullDigest = { ...digest, id: savedId };

      setSavedDigests(prev => [fullDigest, ...prev]);
      return fullDigest;
    } finally {
      setIsGeneratingDigest(false);
    }
  };

  // Active Entry Lookup
  const activeEntry = entries.find(e => e.id === activeEntryId) || null;

  // Loading Screen
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#FBF9F6] flex flex-col items-center justify-center p-6 text-[#3D3B39]">
        <div className="w-10 h-10 border-2 border-[#E8E4DF] border-t-[#8C9B86] rounded-full animate-spin mb-4" />
        <p className="text-xs font-serif italic text-[#8C8279]">
          Entering tranquil reflective space...
        </p>
      </div>
    );
  }

  // Unauthenticated Landing Screen
  if (!currentUser) {
    return <LandingPage onSignIn={handleSignIn} isLoading={isAuthLoading} error={authError} />;
  }

  return (
    <div className="min-h-screen bg-[#FBF9F6] flex flex-col font-serif selection:bg-[#E9EDC9] selection:text-[#5B6356] text-[#3D3B39]">
      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        onNewEntry={handleNewEntry}
        onOpenDigest={() => setIsDigestOpen(true)}
        onSignOut={handleSignOut}
        isCreating={isCreatingEntry}
        entriesCount={entries.length}
      />

      {/* Main Split-Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          entries={entries}
          activeEntryId={activeEntryId}
          onSelectEntry={id => setActiveEntryId(id)}
          onDeleteEntry={handleDeleteEntry}
          onOpenDigest={() => setIsDigestOpen(true)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Active Journal Main Panel */}
        <ActiveJournal
          entry={activeEntry}
          messages={messages}
          streamingText={streamingText}
          isStreaming={isStreaming}
          onSendMessage={handleSendMessage}
          onUpdateTitle={handleUpdateTitle}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
          error={journalError}
          onRetryLastMessage={() => {
            if (lastUserMessageRef.current) {
              handleSendMessage(lastUserMessageRef.current);
            }
          }}
        />
      </div>

      {/* Weekly Digest Modal */}
      <WeeklyDigestModal
        isOpen={isDigestOpen}
        onClose={() => setIsDigestOpen(false)}
        entries={entries}
        savedDigests={savedDigests}
        onGenerateDigest={handleGenerateDigest}
        isGenerating={isGeneratingDigest}
      />
    </div>
  );
}
