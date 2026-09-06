import React, { useState, useMemo } from 'react';
import { Search, Trash2, Sparkles, BookOpen, AlertCircle, X, Calendar } from 'lucide-react';
import type { JournalEntry } from '../types';

interface SidebarProps {
  entries: JournalEntry[];
  activeEntryId: string | null;
  onSelectEntry: (id: string) => void;
  onDeleteEntry: (id: string) => void;
  onOpenDigest: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const MOOD_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  Calm: { bg: 'bg-[#E9EDC9]', text: 'text-[#5B6356]', border: 'border-[#dbe0b8]' },
  Serene: { bg: 'bg-[#E9EDC9]', text: 'text-[#5B6356]', border: 'border-[#dbe0b8]' },
  Grateful: { bg: 'bg-[#FEFAE0]', text: 'text-[#8C8279]', border: 'border-[#EAE3C5]' },
  Hopeful: { bg: 'bg-[#FEFAE0]', text: 'text-[#7A6F4D]', border: 'border-[#EAE3C5]' },
  Quiet: { bg: 'bg-[#D4A373]/20', text: 'text-[#8C8279]', border: 'border-[#D4A373]/30' },
  Pensive: { bg: 'bg-[#D4A373]/20', text: 'text-[#8C8279]', border: 'border-[#D4A373]/30' },
  Reflective: { bg: 'bg-[#F3F1ED]', text: 'text-[#5B6356]', border: 'border-[#E8E4DF]' },
  Vulnerable: { bg: 'bg-[#E8D7D0]/40', text: 'text-[#7D5B50]', border: 'border-[#D6BFB5]' },
  Overwhelmed: { bg: 'bg-[#E8D7D0]/60', text: 'text-[#7D5B50]', border: 'border-[#D6BFB5]' },
  Anxious: { bg: 'bg-[#D4A373]/25', text: 'text-[#8C8279]', border: 'border-[#D4A373]/40' },
  Determined: { bg: 'bg-[#8C9B86]/20', text: 'text-[#5B6356]', border: 'border-[#8C9B86]/30' },
  Clarity: { bg: 'bg-[#E9EDC9]', text: 'text-[#5B6356]', border: 'border-[#dbe0b8]' },
  Open: { bg: 'bg-[#F3F1ED]', text: 'text-[#5B6356]', border: 'border-[#E8E4DF]' },
};

export const getMoodStyle = (mood?: string) => {
  if (!mood) return MOOD_COLOR_MAP['Reflective'];
  return MOOD_COLOR_MAP[mood] || { bg: 'bg-[#F3F1ED]', text: 'text-[#5B6356]', border: 'border-[#E8E4DF]' };
};

export const Sidebar: React.FC<SidebarProps> = ({
  entries,
  activeEntryId,
  onSelectEntry,
  onDeleteEntry,
  onOpenDigest,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Extract unique moods for filter tabs
  const availableMoods = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => {
      if (e.mood && e.mood.trim()) set.add(e.mood.trim());
    });
    return Array.from(set);
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch =
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.summary && entry.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (entry.tags && entry.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchesMood =
        selectedMoodFilter === 'all' ||
        (entry.mood && entry.mood.toLowerCase() === selectedMoodFilter.toLowerCase());

      return matchesSearch && matchesMood;
    });
  }, [entries, searchQuery, selectedMoodFilter]);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-[#3D3B39]/40 backdrop-blur-2xs z-30 md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-80 md:w-84 bg-[#F3F1ED] border-r border-[#E8E4DF] flex flex-col h-[calc(100vh-4rem)] transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header & Search */}
        <div className="p-5 border-b border-[#E8E4DF] bg-white/40">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-[0.2em] font-sans font-bold text-[#8C8279]">
              Recent Reflections ({entries.length})
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenDigest}
                className="text-[11px] font-sans font-semibold uppercase tracking-wider text-[#5B6356] hover:text-[#3D3B39] flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E9EDC9]/60 border border-[#E9EDC9] cursor-pointer transition-colors"
                title="Weekly Digest"
              >
                <Sparkles className="w-3 h-3 text-[#5B6356]" />
                <span>Digest</span>
              </button>
              <button
                onClick={onCloseMobile}
                className="md:hidden p-1 text-[#8C8279] hover:text-[#3D3B39] rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8C8279] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search reflections, tags, themes..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E8E4DF] rounded-xl text-xs text-[#3D3B39] placeholder-[#8C8279] focus:outline-hidden focus:border-[#5B6356] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C8279] hover:text-[#3D3B39] text-xs"
              >
                &times;
              </button>
            )}
          </div>

          {/* Mood Filter Pills */}
          {availableMoods.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 no-scrollbar text-[10px]">
              <button
                onClick={() => setSelectedMoodFilter('all')}
                className={`px-2.5 py-0.5 rounded-full uppercase tracking-wider font-sans font-bold shrink-0 transition-colors ${
                  selectedMoodFilter === 'all'
                    ? 'bg-[#5B6356] text-white'
                    : 'bg-white/80 text-[#8C8279] hover:bg-white border border-[#E8E4DF]'
                }`}
              >
                All
              </button>
              {availableMoods.map(mood => {
                const style = getMoodStyle(mood);
                const isSelected = selectedMoodFilter.toLowerCase() === mood.toLowerCase();
                return (
                  <button
                    key={mood}
                    onClick={() => setSelectedMoodFilter(isSelected ? 'all' : mood)}
                    className={`px-2.5 py-0.5 rounded-full uppercase tracking-wider font-sans font-bold shrink-0 border transition-all ${
                      isSelected
                        ? 'bg-[#5B6356] text-white border-[#5B6356]'
                        : `${style.bg} ${style.text} ${style.border} hover:opacity-80`
                    }`}
                  >
                    {mood}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredEntries.length === 0 ? (
            <div className="py-12 px-4 text-center text-[#8C8279] flex flex-col items-center justify-center">
              <BookOpen className="w-8 h-8 stroke-1 text-[#8C8279]/60 mb-2" />
              <p className="text-xs font-serif text-[#3D3B39]">
                {entries.length === 0 ? 'No reflections yet' : 'No matching reflections'}
              </p>
              <p className="text-[11px] text-[#8C8279] mt-1 max-w-[200px] leading-relaxed">
                {entries.length === 0
                  ? 'Click "+ Start New Entry" to begin your reflective dialogue.'
                  : 'Try adjusting your search terms or mood filters.'}
              </p>
            </div>
          ) : (
            filteredEntries.map(entry => {
              const isActive = entry.id === activeEntryId;
              const moodStyle = getMoodStyle(entry.mood);

              return (
                <div
                  key={entry.id}
                  id={`entry-card-${entry.id}`}
                  onClick={() => {
                    onSelectEntry(entry.id);
                    onCloseMobile();
                  }}
                  className={`group relative p-3.5 rounded-xl text-left cursor-pointer transition-all duration-150 ${
                    isActive
                      ? 'bg-white rounded-xl shadow-xs border border-[#E8E4DF]'
                      : 'hover:bg-white/60 transition-colors rounded-xl border border-transparent hover:border-[#E8E4DF]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-[#8C8279] font-sans mb-1 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {formatDate(entry.updatedAt || entry.createdAt)}
                    </p>

                    {/* Delete action */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setDeleteConfirmId(entry.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#8C8279] hover:text-rose-700 rounded transition-opacity"
                      title="Delete reflection"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3
                    className={`text-sm font-semibold mb-1.5 font-serif line-clamp-1 ${
                      isActive ? 'text-[#3D3B39]' : 'text-[#3D3B39]/90'
                    }`}
                  >
                    {entry.title || 'Reflective Session'}
                  </h3>

                  {/* Summary snippet */}
                  {entry.summary ? (
                    <p className="text-[11px] text-[#8C8279] line-clamp-2 mb-2 font-normal leading-relaxed">
                      {entry.summary}
                    </p>
                  ) : null}

                  {/* Pills Row: Mood & Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {entry.mood && (
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-sans font-bold border ${moodStyle.bg} ${moodStyle.text} ${moodStyle.border}`}
                      >
                        {entry.mood}
                      </span>
                    )}

                    {entry.tags && entry.tags.slice(0, 2).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] px-2 py-0.5 bg-[#FEFAE0] text-[#8C8279] border border-[#EAE3C5] rounded-full uppercase font-sans font-bold truncate max-w-[85px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Inline Delete Confirmation */}
                  {deleteConfirmId === entry.id && (
                    <div
                      onClick={e => e.stopPropagation()}
                      className="absolute inset-0 bg-[#FBF9F6]/98 backdrop-blur-2xs rounded-xl p-3 flex flex-col justify-center items-center text-center z-10 animate-fade-in border border-[#E8E4DF]"
                    >
                      <AlertCircle className="w-4 h-4 text-[#7D5B50] mb-1" />
                      <p className="text-[11px] font-sans font-medium text-[#3D3B39]">
                        Delete this reflection?
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2.5 py-1 text-[11px] font-sans font-medium text-[#8C8279] bg-white hover:bg-[#F3F1ED] border border-[#E8E4DF] rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            onDeleteEntry(entry.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-2.5 py-1 text-[11px] font-sans font-medium text-white bg-[#5B6356] hover:bg-[#4a5146] rounded-lg"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer info */}
        <div className="p-4 border-t border-[#E8E4DF] bg-white/30 text-[10px] text-[#8C8279] uppercase tracking-wider font-sans flex items-center justify-between">
          <span>Private &bull; Encrypted</span>
          <span>Firestore Cloud</span>
        </div>
      </aside>
    </>
  );
};

