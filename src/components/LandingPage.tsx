import React from 'react';
import { Sparkles, Shield, BookOpen, ArrowRight, Sun, MessageSquareHeart } from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, isLoading, error }) => {
  return (
    <div className="min-h-screen bg-[#FBF9F6] text-[#3D3B39] flex flex-col justify-between selection:bg-[#E9EDC9] selection:text-[#5B6356]">
      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#8C9B86] rounded-full flex items-center justify-center shadow-xs">
            <div className="w-3.5 h-3.5 bg-white rounded-full opacity-70" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif font-medium text-[#5B6356] tracking-tight text-xl">
              Dear Diary
            </span>
            <span className="text-[10px] uppercase tracking-widest text-[#8C8279] font-sans font-semibold">
              Journal
            </span>
          </div>
        </div>

        <button
          id="nav-signin-btn"
          onClick={onSignIn}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-5 py-2 text-xs uppercase tracking-widest font-sans font-semibold text-[#8C8279] hover:text-[#5B6356] bg-white/70 border border-[#E8E4DF] rounded-full hover:bg-white shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <span className="animate-pulse">Connecting...</span>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#8C8279]" />
            </>
          )}
        </button>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-5xl mx-auto px-6 py-10 md:py-16 flex flex-col items-center text-center">
        {/* Subtle pill badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E9EDC9] border border-[#dbe0b8] text-[#5B6356] text-xs font-sans font-semibold uppercase tracking-wider mb-8 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#5B6356]" />
          <span>A tranquil harbor for your thoughts</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-serif tracking-tight text-[#3D3B39] max-w-3xl leading-[1.18]">
          A reflective companion that helps you untangle your mind.
        </h1>

        <p className="mt-6 text-lg md:text-xl text-[#8C8279] max-w-2xl font-serif italic leading-relaxed">
          More than a blank notebook. Engage in grounded multi-turn reflection, observe emerging emotional patterns, and synthesize weekly growth through calm AI dialogue.
        </p>

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-[#E8D7D0]/60 border border-[#D6BFB5] text-[#7D5B50] text-xs max-w-md text-left flex items-start gap-3">
            <span className="font-bold">Notice:</span>
            <span>{error}</span>
          </div>
        )}

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <button
            id="hero-google-signin-btn"
            onClick={onSignIn}
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full bg-[#5B6356] hover:bg-[#4c5348] text-white font-sans text-xs uppercase tracking-widest font-bold shadow-lg shadow-[#5B6356]/20 transition-all transform active:scale-98 disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Signing in with Google...
              </span>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

        {/* Feature Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <div className="p-6 rounded-2xl bg-white border border-[#E8E4DF] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#E9EDC9] text-[#5B6356] flex items-center justify-center mb-4">
              <MessageSquareHeart className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-semibold text-[#3D3B39] text-base">Conversational Clarification</h3>
            <p className="mt-2 text-[#8C8279] text-xs leading-relaxed">
              Express raw stream-of-consciousness thoughts freely. Dear Diary listens, holds space for your feelings, and offers gentle emotional comfort.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E8E4DF] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#FEFAE0] text-[#8C8279] flex items-center justify-center mb-4 border border-[#EAE3C5]">
              <Sun className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-semibold text-[#3D3B39] text-base">Live Mood &amp; Tag Extraction</h3>
            <p className="mt-2 text-[#8C8279] text-xs leading-relaxed">
              Automatic extraction of your nuanced emotional states, emerging recurring themes, and a crisp 1-sentence TL;DR snapshot.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E8E4DF] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#8C9B86]/20 text-[#5B6356] flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-semibold text-[#3D3B39] text-base">Weekly Reflection Synthesis</h3>
            <p className="mt-2 text-[#8C8279] text-xs leading-relaxed">
              Synthesizes past 7-day entries into emotional arcs, breakthroughs, friction points, and guiding questions for the coming week.
            </p>
          </div>
        </div>

        {/* Security & Privacy callout */}
        <div className="mt-12 py-3 px-5 rounded-full bg-[#F3F1ED] border border-[#E8E4DF] flex items-center gap-2.5 text-[#8C8279] text-xs max-w-xl">
          <Shield className="w-4 h-4 text-[#5B6356] shrink-0" />
          <span>Strict User Isolation: Scoped securely to your Google ID with Cloud Firestore security rules.</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#E8E4DF] py-6 text-center text-xs text-[#8C8279] font-sans">
        <p>Dear Diary &bull; Natural Tones Aesthetic &bull; Firebase Firestore &amp; Gemini AI</p>
      </footer>
    </div>
  );
};

