import React, { useState } from 'react';
import Markdown from 'react-markdown';
import {
  Sparkles,
  X,
  Calendar,
  Layers,
  Heart,
  TrendingUp,
  HelpCircle,
  Clock,
  Copy,
  Check,
  BookOpen,
} from 'lucide-react';
import type { JournalEntry, WeeklyDigest } from '../types';

interface WeeklyDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  savedDigests: WeeklyDigest[];
  onGenerateDigest: (entriesToAnalyze: JournalEntry[]) => Promise<WeeklyDigest>;
  isGenerating: boolean;
}

export const WeeklyDigestModal: React.FC<WeeklyDigestModalProps> = ({
  isOpen,
  onClose,
  entries,
  savedDigests,
  onGenerateDigest,
  isGenerating,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [currentDigest, setCurrentDigest] = useState<WeeklyDigest | null>(null);
  const [selectedHistoryDigest, setSelectedHistoryDigest] = useState<WeeklyDigest | null>(null);
  const [copied, setCopied] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter entries from past 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const past7DaysEntries = entries.filter(e => {
    const d = new Date(e.updatedAt || e.createdAt);
    return !isNaN(d.getTime()) && d >= sevenDaysAgo;
  });

  // If user has entries but fewer in the strict 7-day window, allow fallback to most recent entries
  const eligibleEntries = past7DaysEntries.length > 0 ? past7DaysEntries : entries.slice(0, 7);

  const handleGenerate = async () => {
    setGenerationError(null);
    try {
      const digest = await onGenerateDigest(eligibleEntries);
      setCurrentDigest(digest);
    } catch (err: any) {
      setGenerationError(err?.message || 'Failed to synthesize reflections. Please try again.');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeDisplayDigest =
    activeTab === 'history' ? (selectedHistoryDigest || savedDigests[0]) : (currentDigest || savedDigests[0] || null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D3B39]/40 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-[#FBF9F6] rounded-3xl border border-[#E8E4DF] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-[#3D3B39]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E8E4DF] bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#8C9B86] flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-serif font-medium text-[#3D3B39]">
                Weekly Reflection Synthesis
              </h2>
              <p className="text-xs text-[#8C8279] font-sans">
                Observe emotional arcs, breakthroughs, and guiding inquiries across recent reflections
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="bg-[#F3F1ED] p-1 rounded-xl flex items-center text-xs font-sans">
              <button
                onClick={() => setActiveTab('create')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'create'
                    ? 'bg-white text-[#3D3B39] font-semibold shadow-2xs'
                    : 'text-[#8C8279] hover:text-[#3D3B39]'
                }`}
              >
                Synthesis
              </button>
              <button
                onClick={() => {
                  setActiveTab('history');
                  if (!selectedHistoryDigest && savedDigests.length > 0) {
                    setSelectedHistoryDigest(savedDigests[0]);
                  }
                }}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'history'
                    ? 'bg-white text-[#3D3B39] font-semibold shadow-2xs'
                    : 'text-[#8C8279] hover:text-[#3D3B39]'
                }`}
              >
                Archive ({savedDigests.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-[#8C8279] hover:text-[#3D3B39] rounded-lg hover:bg-[#F3F1ED] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 font-sans">
          {activeTab === 'create' && (
            <div>
              {/* Generation Controls */}
              <div className="p-5 rounded-2xl bg-white border border-[#E8E4DF] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#5B6356]" />
                    <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#8C8279]">
                      Scope: Past 7 Days
                    </span>
                  </div>
                  <p className="text-xs text-[#3D3B39] mt-1.5">
                    Found <strong>{eligibleEntries.length}</strong> reflection session
                    {eligibleEntries.length === 1 ? '' : 's'} ready for synthesis.
                  </p>
                </div>

                <button
                  id="generate-digest-submit-btn"
                  onClick={handleGenerate}
                  disabled={isGenerating || eligibleEntries.length === 0}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#5B6356] hover:bg-[#4c5348] text-white rounded-full text-xs uppercase tracking-widest font-sans font-bold shadow-lg shadow-[#5B6356]/20 disabled:opacity-40 transition-all shrink-0 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#E9EDC9]" />
                      <span>{currentDigest ? 'Re-generate Digest' : 'Generate Weekly Digest'}</span>
                    </>
                  )}
                </button>
              </div>

              {generationError && (
                <div className="mt-4 p-3.5 rounded-xl bg-[#E8D7D0]/60 border border-[#D6BFB5] text-xs text-[#7D5B50]">
                  {generationError}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && savedDigests.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E8E4DF] no-scrollbar">
              {savedDigests.map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelectedHistoryDigest(d)}
                  className={`px-3.5 py-2 rounded-xl text-xs shrink-0 border transition-all text-left font-sans ${
                    selectedHistoryDigest?.id === d.id
                      ? 'bg-[#5B6356] text-white border-[#5B6356] shadow-xs'
                      : 'bg-white border-[#E8E4DF] text-[#3D3B39] hover:bg-[#F3F1ED]'
                  }`}
                >
                  <div className="font-semibold truncate max-w-[160px]">{d.headline}</div>
                  <div className="text-[10px] opacity-75">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Render Active Digest */}
          {activeDisplayDigest ? (
            <div className="space-y-6 animate-fade-in">
              {/* Digest Headline & Meta */}
              <div className="border-b border-[#E8E4DF] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#5B6356] bg-[#E9EDC9] px-2.5 py-1 rounded-full border border-[#dbe0b8]">
                    {activeDisplayDigest.period || 'Past 7 Days'}
                  </span>
                  <h3 className="text-xl md:text-2xl font-serif font-medium text-[#3D3B39] mt-2.5">
                    &ldquo;{activeDisplayDigest.headline}&rdquo;
                  </h3>
                </div>

                <button
                  onClick={() => handleCopy(activeDisplayDigest.digestMarkdown)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-[#5B6356] bg-white border border-[#E8E4DF] hover:bg-[#F3F1ED] rounded-full transition-colors shrink-0 self-start md:self-auto cursor-pointer font-sans font-semibold uppercase tracking-wider"
                  title="Copy full synthesis markdown"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#5B6356]" />
                      <span className="text-[#5B6356]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#8C8279]" />
                      <span>Copy Markdown</span>
                    </>
                  )}
                </button>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Emotional Landscape */}
                <div className="p-5 rounded-2xl bg-white border border-[#E8E4DF] shadow-xs">
                  <div className="flex items-center gap-2 text-[#3D3B39] font-medium text-xs mb-2">
                    <Heart className="w-4 h-4 text-[#C28C7E]" />
                    <span className="font-serif text-sm">Emotional Landscape &amp; Arc</span>
                  </div>
                  <p className="text-xs text-[#8C8279] leading-relaxed font-sans">
                    {activeDisplayDigest.primaryMoodLandscape}
                  </p>
                </div>

                {/* Recurring Themes */}
                <div className="p-5 rounded-2xl bg-white border border-[#E8E4DF] shadow-xs">
                  <div className="flex items-center gap-2 text-[#3D3B39] font-medium text-xs mb-2">
                    <Layers className="w-4 h-4 text-[#8C9B86]" />
                    <span className="font-serif text-sm">Recurring Themes</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {activeDisplayDigest.recurringThemes?.map((theme, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-[#F3F1ED] border border-[#E8E4DF] text-[#8C8279] font-sans"
                      >
                        #{theme}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Breakthroughs & Growth */}
                <div className="p-5 rounded-2xl bg-[#E9EDC9]/30 border border-[#E9EDC9] shadow-xs">
                  <div className="flex items-center gap-2 text-[#5B6356] font-medium text-xs mb-2">
                    <TrendingUp className="w-4 h-4 text-[#5B6356]" />
                    <span className="font-serif text-sm">Breakthroughs &amp; Insights</span>
                  </div>
                  <p className="text-xs text-[#5B6356] leading-relaxed font-sans">
                    {activeDisplayDigest.breakthroughsAndGrowth}
                  </p>
                </div>

                {/* Tensions & Friction */}
                <div className="p-5 rounded-2xl bg-[#F3F1ED] border border-[#E8E4DF] shadow-xs">
                  <div className="flex items-center gap-2 text-[#3D3B39] font-medium text-xs mb-2">
                    <Clock className="w-4 h-4 text-[#8C8279]" />
                    <span className="font-serif text-sm">Tensions &amp; Lingering Friction</span>
                  </div>
                  <p className="text-xs text-[#8C8279] leading-relaxed font-sans">
                    {activeDisplayDigest.tensionsAndFriction}
                  </p>
                </div>
              </div>

              {/* Inquiries for the Coming Week */}
              {activeDisplayDigest.gentleInquiriesForNextWeek &&
                activeDisplayDigest.gentleInquiriesForNextWeek.length > 0 && (
                  <div className="p-6 rounded-2xl bg-[#5B6356] text-white shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-wider text-[#E9EDC9] mb-3">
                      <HelpCircle className="w-4 h-4" />
                      <span>Guiding Inquiries for the Coming Week</span>
                    </div>
                    <ul className="space-y-2.5 text-xs text-white/90 font-light font-serif">
                      {activeDisplayDigest.gentleInquiriesForNextWeek.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="w-4 h-4 rounded-full bg-[#8C9B86] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-sans font-bold">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">&ldquo;{q}&rdquo;</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Full Markdown Report Section */}
              <div className="pt-2">
                <h4 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#8C8279] mb-3">
                  Full Synthesis Report
                </h4>
                <div className="p-6 rounded-2xl bg-white border border-[#E8E4DF] text-[#3D3B39] text-xs leading-relaxed markdown-body font-serif space-y-2">
                  <Markdown>{activeDisplayDigest.digestMarkdown}</Markdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-[#8C8279]">
              <div className="w-12 h-12 bg-[#8C9B86]/20 rounded-full flex items-center justify-center mx-auto mb-3 text-[#5B6356]">
                <BookOpen className="w-6 h-6 stroke-1" />
              </div>
              <p className="text-sm font-serif font-medium text-[#3D3B39]">No Weekly Synthesis Generated Yet</p>
              <p className="text-xs text-[#8C8279] max-w-sm mx-auto mt-1 leading-relaxed">
                Click &ldquo;Generate Weekly Digest&rdquo; above to have Gemini analyze and synthesize your reflections from the past 7 days.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#E8E4DF] bg-[#FBF9F6] flex items-center justify-between text-xs text-[#8C8279] font-sans">
          <span>Encrypted to your ID &bull; Cloud Firestore Scoped</span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-full bg-white hover:bg-[#F3F1ED] text-[#3D3B39] border border-[#E8E4DF] font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
