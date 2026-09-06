import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  Send,
  Sparkles,
  Edit2,
  Check,
  Menu,
  RotateCcw,
  Tag,
  AlertTriangle,
  Lightbulb,
  Clock,
  User,
  Compass,
  Smile,
  Info,
  Mic,
  MicOff,
} from 'lucide-react';
import type { JournalEntry, JournalMessage } from '../types';
import { getMoodStyle } from './Sidebar';

interface ActiveJournalProps {
  entry: JournalEntry | null;
  messages: JournalMessage[];
  streamingText: string;
  isStreaming: boolean;
  onSendMessage: (text: string) => Promise<void>;
  onUpdateTitle: (newTitle: string) => Promise<void>;
  onToggleMobileSidebar: () => void;
  error?: string | null;
  onRetryLastMessage?: () => void;
}

const INSPIRATION_PROMPTS = [
  'What is taking up the most quiet space in your mind today?',
  'What brought you a moment of unexpected gratitude or relief?',
  'What is a boundary or expectation you found challenging this week?',
  'If you listened deeply to your fatigue right now, what is it asking for?',
  'What is one honest truth you have been hesitating to admit to yourself?',
];

export const ActiveJournal: React.FC<ActiveJournalProps> = ({
  entry,
  messages,
  streamingText,
  isStreaming,
  onSendMessage,
  onUpdateTitle,
  onToggleMobileSidebar,
  error,
  onRetryLastMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (entry) {
      setTitleDraft(entry.title);
      setIsEditingTitle(false);
    }
  }, [entry?.id, entry?.title]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setSpeechNotice('Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.');
      setTimeout(() => setSpeechNotice(null), 5000);
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    } else {
      try {
        setSpeechNotice(null);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        const startingText = inputText;

        recognition.onstart = () => {
          setIsListening(true);
          setSpeechNotice(null);
        };

        recognition.onresult = (event: any) => {
          let accumulated = '';
          for (let i = 0; i < event.results.length; ++i) {
            accumulated += event.results[i][0].transcript;
          }
          if (accumulated) {
            const prefix = startingText ? (startingText.endsWith(' ') ? startingText : startingText + ' ') : '';
            setInputText(prefix + accumulated);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition status:', event.error);
          if (event.error === 'not-allowed') {
            setSpeechNotice('Microphone access was denied. Please allow microphone permissions in your browser.');
          } else if (event.error !== 'no-speech') {
            setSpeechNotice(`Voice input message: ${event.error}`);
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err: any) {
        console.warn('Failed to start speech recognition:', err);
        setSpeechNotice('Could not start voice input. Please try again.');
        setIsListening(false);
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isStreaming) return;

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }

    try {
      await onSendMessage(trimmed);
      setInputText('');
    } catch (err) {
      console.error('Failed to submit message:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTitleSubmit = async () => {
    if (!titleDraft.trim() || !entry) return;
    try {
      await onUpdateTitle(titleDraft.trim());
      setIsEditingTitle(false);
    } catch (err) {
      console.error('Failed to update title:', err);
    }
  };

  if (!entry) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#8C8279] bg-[#FBF9F6]">
        <div className="w-12 h-12 bg-[#8C9B86]/20 rounded-full flex items-center justify-center mb-3 text-[#5B6356]">
          <Compass className="w-6 h-6 stroke-1" />
        </div>
        <h3 className="text-lg font-serif text-[#3D3B39]">No Reflection Selected</h3>
        <p className="text-xs text-[#8C8279] max-w-sm mt-1 leading-relaxed">
          Select an entry from the sidebar or click &ldquo;Start New Entry&rdquo; to begin untangling your thoughts.
        </p>
      </div>
    );
  }

  const moodStyle = getMoodStyle(entry.mood);

  return (
    <div className="flex-1 flex flex-row h-[calc(100vh-4rem)] bg-white overflow-hidden">
      {/* Central Reflection Column */}
      <section className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Top Session Header */}
        <div className="border-b border-[#E8E4DF] px-4 md:px-8 py-3 bg-[#FBF9F6]/60 flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <button
                onClick={onToggleMobileSidebar}
                className="md:hidden p-1.5 text-[#8C8279] hover:text-[#3D3B39] rounded-lg hover:bg-[#F3F1ED]"
                title="Open Reflections Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              {isEditingTitle ? (
                <div className="flex items-center gap-1.5 flex-1 max-w-md">
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleTitleSubmit()}
                    className="w-full text-base md:text-lg font-serif font-medium text-[#3D3B39] border-b border-[#5B6356] bg-transparent focus:outline-hidden py-0.5"
                    autoFocus
                  />
                  <button
                    onClick={handleTitleSubmit}
                    className="p-1 text-[#5B6356] hover:text-[#3D3B39] rounded-md hover:bg-[#E9EDC9]/50"
                    title="Save title"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group flex-1 min-w-0">
                  <h2 className="text-base md:text-lg font-serif font-medium text-[#3D3B39] truncate">
                    {entry.title || 'Reflective Session'}
                  </h2>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#8C8279] hover:text-[#3D3B39] rounded-md transition-opacity"
                    title="Edit title"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Current Mood Pill (Mobile / Quick view) */}
            {entry.mood && (
              <div
                className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full uppercase font-sans font-bold flex items-center gap-1.5 border ${moodStyle.bg} ${moodStyle.text} ${moodStyle.border}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                <span>{entry.mood}</span>
              </div>
            )}
          </div>

          {/* Sub-info Bar */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-[#8C8279]">
            <span className="flex items-center gap-1 text-[11px] font-sans">
              <Clock className="w-3 h-3 text-[#8C8279]/70" />
              <span>Started {new Date(entry.createdAt).toLocaleDateString()}</span>
            </span>

            {entry.tags && entry.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap ml-2">
                {entry.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#FEFAE0] text-[#8C8279] text-[9px] uppercase font-sans font-bold border border-[#EAE3C5]"
                  >
                    <Tag className="w-2 h-2" />
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            )}

            {isStreaming && (
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-sans font-bold text-[#5B6356] bg-[#E9EDC9] px-2.5 py-0.5 rounded-full animate-pulse ml-auto">
                <Sparkles className="w-3 h-3 text-[#5B6356]" />
                <span>Reflecting in real-time...</span>
              </span>
            )}
          </div>
        </div>

        {/* Mobile/Tablet Inline Summary Banner if available */}
        {entry.summary && (
          <div className="xl:hidden mx-4 mt-3 p-3 rounded-xl bg-[#F3F1ED] border border-[#E8E4DF] flex items-start gap-2.5 text-xs text-[#3D3B39]">
            <Sparkles className="w-4 h-4 text-[#8C9B86] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#8C8279] mr-1.5">
                Summary TL;DR:
              </span>
              <span className="text-xs italic text-[#5B6356] leading-relaxed">{entry.summary}</span>
            </div>
          </div>
        )}

        {/* Messages Stream Timeline */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col gap-6 font-sans">
          <div className="max-w-2xl mx-auto w-full space-y-6">
            {messages.length === 0 && !streamingText ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 bg-[#8C9B86]/15 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#8C9B86]/25">
                  <Sparkles className="w-5 h-5 text-[#5B6356]" />
                </div>
                <h3 className="font-serif text-xl text-[#3D3B39]">What is resting on your heart today?</h3>
                <p className="text-xs text-[#8C8279] mt-2 leading-relaxed max-w-md mx-auto">
                  Type or speak your thoughts freely. Dear Diary is here to listen without judgment, offering warm comfort and gentle, loving reflections.
                </p>

                <div className="mt-8 flex flex-col gap-2 max-w-md mx-auto text-left">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#8C8279] px-1">
                    Reflective Inquiries to Explore:
                  </span>
                  {INSPIRATION_PROMPTS.slice(0, 3).map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputText(prompt)}
                      className="p-3 rounded-xl border border-[#E8E4DF] bg-[#FBF9F6] hover:bg-[#F3F1ED] text-xs text-[#3D3B39] font-serif text-left transition-colors cursor-pointer"
                    >
                      &ldquo;{prompt}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id || index}
                    className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex items-start gap-3 max-w-[88%] sm:max-w-[78%] ${
                        isUser ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      {/* Avatar icon */}
                      {isUser ? (
                        <div className="w-8 h-8 rounded-lg bg-[#5B6356] text-white shrink-0 border border-[#4c5348] flex items-center justify-center shadow-2xs">
                          <User className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-[#8C9B86] shrink-0 flex items-center justify-center shadow-2xs">
                          <span className="text-[12px] text-white font-serif font-bold">D</span>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`p-4 rounded-2xl shadow-2xs ${
                          isUser
                            ? 'bg-[#F3F1ED] rounded-tr-none border border-[#E8E4DF]'
                            : 'bg-[#8C9B86]/10 rounded-tl-none border border-[#8C9B86]/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 text-[10px] text-[#8C8279] font-sans uppercase tracking-wider mb-1">
                          <span className={isUser ? 'font-semibold text-[#5B6356]' : 'font-semibold text-[#5B6356] font-serif'}>
                            {isUser ? 'You' : 'Dear Diary'}
                          </span>
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {isUser ? (
                          <p className="text-sm leading-relaxed text-[#3D3B39] whitespace-pre-wrap font-sans">
                            {msg.content}
                          </p>
                        ) : (
                          <div className="text-sm leading-relaxed text-[#3D3B39] font-serif markdown-body space-y-2">
                            <Markdown>{msg.content}</Markdown>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Live Streaming Assistant Message (Left-aligned) */}
            {isStreaming && (
              <div className="flex justify-start w-full">
                <div className="flex flex-row items-start gap-3 max-w-[88%] sm:max-w-[78%]">
                  <div className="w-8 h-8 rounded-lg bg-[#8C9B86] shrink-0 flex items-center justify-center shadow-2xs animate-pulse">
                    <span className="text-[12px] text-white font-serif font-bold">D</span>
                  </div>

                  <div className="bg-[#8C9B86]/10 p-4 rounded-2xl rounded-tl-none border border-[#8C9B86]/20 shadow-2xs max-w-full">
                    <div className="flex items-center gap-2 text-[10px] text-[#8C8279] font-sans uppercase tracking-wider mb-1">
                      <span className="font-semibold text-[#5B6356] font-serif">Dear Diary</span>
                      <span className="inline-flex items-center gap-1 text-[#8C9B86] font-sans">
                        <Sparkles className="w-2.5 h-2.5 animate-spin" />
                        <span>Reflecting...</span>
                      </span>
                    </div>
                    <div className="text-sm leading-relaxed text-[#3D3B39] font-serif markdown-body space-y-2">
                      <Markdown>{streamingText || '...'}</Markdown>
                    </div>
                    <span className="inline-block w-1.5 h-3 bg-[#5B6356] animate-pulse ml-1 align-middle" />
                  </div>
                </div>
              </div>
            )}

            {/* Error Feedback */}
            {error && (
              <div className="p-3.5 rounded-xl bg-[#E8D7D0]/50 border border-[#D6BFB5] flex items-center justify-between gap-3 text-xs text-[#7D5B50]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#7D5B50] shrink-0" />
                  <span>{error}</span>
                </div>
                {onRetryLastMessage && (
                  <button
                    onClick={onRetryLastMessage}
                    className="px-2.5 py-1 rounded-lg bg-[#5B6356] text-white font-medium hover:bg-[#4a5146] flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry Save</span>
                  </button>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Composer (Exact Natural Tones styling with Voice Input) */}
        <div className="h-44 sm:h-52 border-t border-[#E8E4DF] bg-[#FBF9F6] p-4 sm:p-6 flex flex-col shrink-0">
          {/* Active Voice Listening Banner */}
          {isListening && (
            <div className="mb-2 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 self-start animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              <span className="font-sans font-medium">Listening to your voice... Speak your heart to Dear Diary</span>
            </div>
          )}

          {/* Speech Notice / Fallback Banner */}
          {speechNotice && (
            <div className="mb-2 px-3.5 py-1 rounded-lg bg-[#FEFAE0] border border-[#EAE3C5] text-[#7A6F4D] text-xs flex items-center justify-between gap-2">
              <span>{speechNotice}</span>
              <button
                type="button"
                onClick={() => setSpeechNotice(null)}
                className="text-[10px] font-bold uppercase tracking-wider hover:underline ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className="flex-1 relative flex flex-col">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              placeholder="Speak or write your heart..."
              className="w-full h-full bg-transparent border-none focus:ring-0 focus:outline-hidden resize-none font-serif text-base sm:text-lg text-[#3D3B39] placeholder-[#BAB3AC]"
            />

            <div className="absolute bottom-1 right-1 flex items-center gap-2 sm:gap-3">
              {/* Optional inspiration toggle */}
              <button
                type="button"
                onClick={() => {
                  const randomPrompt =
                    INSPIRATION_PROMPTS[Math.floor(Math.random() * INSPIRATION_PROMPTS.length)];
                  setInputText(randomPrompt);
                }}
                className="p-2.5 sm:p-3 bg-[#E9EDC9] text-[#5B6356] rounded-full hover:shadow-md transition-shadow cursor-pointer"
                title="Insert reflective prompt"
              >
                <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Voice Input Button */}
              <button
                id="journal-voice-btn"
                type="button"
                onClick={toggleVoiceInput}
                className={`p-2.5 sm:p-3 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200 shadow-md'
                    : 'bg-[#FEFAE0] text-[#7A6F4D] hover:bg-[#F4EFC5] border border-[#EAE3C5] shadow-xs'
                }`}
                title={isListening ? 'Stop voice recording' : 'Speak using microphone (Voice Input)'}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>

              <button
                id="journal-send-btn"
                type="submit"
                disabled={!inputText.trim() || isStreaming}
                className="px-5 sm:px-8 py-2.5 sm:py-3 bg-[#5B6356] hover:bg-[#4c5348] text-white rounded-full font-sans text-xs sm:text-sm font-bold shadow-lg shadow-[#5B6356]/20 uppercase tracking-widest disabled:opacity-40 transition-all cursor-pointer"
              >
                Reflect
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Right Aside: Live Enrichment Panel (From Design HTML) */}
      <aside className="w-68 xl:w-72 border-l border-[#E8E4DF] bg-[#FBF9F6] p-6 hidden lg:flex flex-col gap-6 shrink-0 overflow-y-auto">
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#E8E4DF]">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-sans font-bold text-[#8C8279] mb-4">
            Live Enrichment
          </h3>

          {/* Current Mood */}
          <div className="mb-5">
            <p className="text-[10px] text-[#8C8279] uppercase font-sans mb-1.5 font-bold">
              Current Mood
            </p>
            <div className="flex items-center gap-2 text-[#5B6356]">
              <div className="w-2 h-2 rounded-full bg-[#D4A373] animate-pulse" />
              <span className="text-sm font-bold font-serif">
                {entry.mood || 'Reflective / Open'}
              </span>
            </div>
          </div>

          {/* Themes Identified */}
          <div className="mb-5">
            <p className="text-[10px] text-[#8C8279] uppercase font-sans mb-1.5 font-bold">
              Themes Identified
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {entry.tags && entry.tags.length > 0 ? (
                entry.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2.5 py-1 bg-[#F3F1ED] text-[#8C8279] rounded-lg border border-[#E8E4DF] font-sans"
                  >
                    #{tag}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-[#8C8279] italic">
                  Themes develop as you write...
                </span>
              )}
            </div>
          </div>

          {/* Summary TL;DR */}
          <div>
            <p className="text-[10px] text-[#8C8279] uppercase font-sans mb-1 font-bold">
              Summary TL;DR
            </p>
            <p className="text-xs italic leading-relaxed text-[#5B6356] border-l-2 border-[#D6CEC5] pl-3 py-1 mt-2 font-serif">
              {entry.summary || 'A gentle synthesis will emerge after your first reflection exchange.'}
            </p>
          </div>
        </div>

        {/* Clarity Exercise Card (From Design HTML) */}
        <div className="mt-auto p-4 bg-[#E9EDC9]/30 rounded-2xl border border-[#E9EDC9]">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-[#5B6356]" />
            <span className="text-[10px] font-sans font-bold text-[#5B6356] uppercase tracking-wider">
              Clarity Exercise
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-[#5B6356] italic font-serif">
            Try identifying one expectation you carried into today that you can gently grant yourself permission to release.
          </p>
        </div>
      </aside>
    </div>
  );
};

