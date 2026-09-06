import React from 'react';
import { Sparkles, Plus, LogOut } from 'lucide-react';
import type { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile;
  onNewEntry: () => void;
  onOpenDigest: () => void;
  onSignOut: () => void;
  isCreating: boolean;
  entriesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onNewEntry,
  onOpenDigest,
  onSignOut,
  isCreating,
  entriesCount,
}) => {
  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-8 bg-white/60 border-b border-[#E8E4DF] backdrop-blur-md shrink-0 sticky top-0 z-30">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-[#8C9B86] rounded-full flex items-center justify-center shrink-0 shadow-xs">
          <div className="w-3.5 h-3.5 bg-white rounded-full opacity-70" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-serif font-medium tracking-tight text-[#5B6356]">
            Dear Diary
          </span>
          <span className="hidden md:inline-block text-[10px] uppercase tracking-widest text-[#8C8279] font-sans font-semibold">
            Journal
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 sm:gap-6">
        <button
          id="nav-weekly-digest-btn"
          onClick={onOpenDigest}
          className="text-xs uppercase tracking-widest text-[#8C8279] hover:text-[#5B6356] font-sans font-semibold transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/80 border border-transparent hover:border-[#E8E4DF] cursor-pointer"
          title="Synthesize reflections from the past 7 days"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#8C9B86]" />
          <span>Weekly Digest</span>
        </button>

        <button
          id="nav-new-reflection-btn"
          onClick={onNewEntry}
          disabled={isCreating}
          className="px-3.5 py-2 sm:px-5 sm:py-2 bg-[#5B6356] hover:bg-[#4c5348] text-white rounded-xl font-sans text-xs font-bold uppercase tracking-wider shadow-md shadow-[#5B6356]/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Start New Entry</span>
          <span className="sm:hidden">New</span>
        </button>

        {/* User Info & Sign Out */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#E8E4DF]">
          <div className="text-right hidden lg:block">
            <p className="text-xs font-sans font-bold text-[#5B6356] truncate max-w-[130px]">
              {user.displayName || 'Reflective Member'}
            </p>
            <p className="text-[10px] font-sans text-[#8C8279] uppercase tracking-tight truncate max-w-[130px]">
              {user.email || 'Member'}
            </p>
          </div>

          <div className="w-9 h-9 rounded-full border-2 border-[#D6CEC5] overflow-hidden flex items-center justify-center bg-[#F3F1ED] shrink-0">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-xs font-bold text-[#5B6356] font-serif">
                {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <button
            id="nav-signout-btn"
            onClick={onSignOut}
            className="p-1.5 text-[#8C8279] hover:text-[#5B6356] hover:bg-[#F3F1ED] rounded-lg transition-colors cursor-pointer"
            title="Sign out of your account"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

