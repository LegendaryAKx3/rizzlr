'use client';

import { useState, useEffect } from 'react';
import { useUser, useClerk, UserButton, SignedIn } from '@clerk/nextjs';
import { aiMatches } from '@/lib/aiMatches';
import { AIMatch, UserCard } from '@/types';
import SwipeCard from '@/components/SwipeCard';
import ChatInterface from '@/components/ChatInterface';
import OnboardingFlow from '@/components/OnboardingFlow';
import { Heart, X, Star, Info } from 'lucide-react';
import Image from 'next/image';
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function Home() {
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState<AIMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<AIMatch | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [userCard, setUserCard] = useState<UserCard | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const currentMatch = aiMatches[currentIndex];

  // Load user card from localStorage
  useEffect(() => {
    if (isSignedIn && user) {
      const savedCard = localStorage.getItem(`userCard_${user.id}`);
      if (savedCard) {
        setUserCard(JSON.parse(savedCard));
      } else {
        // User is signed in but has no card - show onboarding
        setShowOnboarding(true);
      }
    } else {
      // User signed out - reset state
      setUserCard(null);
      setShowOnboarding(false);
    }
  }, [isSignedIn, user]);

  const handleOnboardingComplete = (newUserCard: UserCard) => {
    setUserCard(newUserCard);
    localStorage.setItem(`userCard_${user?.id}`, JSON.stringify(newUserCard));
    setShowOnboarding(false);
  };

  const checkAuthAndOnboarding = () => {
    if (!isSignedIn) {
      // Programmatically open sign-in modal
      openSignIn();
      return false;
    }
    if (isSignedIn && !userCard) {
      // User is signed in but hasn't completed onboarding
      setShowOnboarding(true);
      return false;
    }
    return true;
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!checkAuthAndOnboarding()) return;

    if (direction === 'right') {
      setMatches([...matches, currentMatch]);
      toast.success(`It's a match with ${currentMatch.name}! 💕`, {
        icon: '🎉',
        duration: 2000,
      });
    } else {
      toast(`${currentMatch.name} is looking for someone else`, {
        icon: '👋',
        duration: 1500,
      });
    }

    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % aiMatches.length);
    }, 200);
  };

  const handleCardClick = () => {
    // Card click doesn't open chat, user must swipe right first
  };

  const handleStar = () => {
    if (!checkAuthAndOnboarding()) return;
    toast('Super liked! ⭐', {
      icon: '⭐',
      duration: 1500,
    });
  };

  const handleInfo = () => {
    if (!checkAuthAndOnboarding()) return;
    toast('View full profile', {
      icon: 'ℹ️',
      duration: 1500,
    });
  };

  const handleMatchClick = (match: AIMatch) => {
    if (!checkAuthAndOnboarding()) return;
    setSelectedMatch(match);
    setShowChat(true);
  };

  // Show onboarding if needed
  if (isSignedIn && showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (showChat && selectedMatch) {
    return <ChatInterface match={selectedMatch} onBack={() => setShowChat(false)} />;
  }

  return (
    <div className="min-h-screen px-4 py-6 bg-gray-200">
      {/* User Button - Only show when signed in */}
      <SignedIn>
        <div className="fixed top-6 left-6 z-50">
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: '999px',
            border: '1px solid rgba(107, 114, 128, 0.3)',
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#374151',
            boxShadow: '0 20px 40px rgba(107, 114, 128, 0.25)',
          },
        }}
      />

      {/* Fixed chat sidebar at top right */}
      <aside className="fixed top-6 right-6 w-80 rounded-[32px] border border-gray-300 bg-gray-200 p-6 shadow-lg z-50 max-h-[calc(100vh-3rem)] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-gray-600">Connections</p>
            <h3 className="text-xl font-semibold text-gray-900">Messages</h3>
          </div>
          <span className="rounded-full bg-gray-400 px-3 py-1 text-xs font-semibold text-gray-900">
            {matches.length.toString().padStart(2, '0')}
          </span>
        </div>

        {matches.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-gray-400 bg-gray-300 p-6 text-center text-sm text-gray-700">
            <p>Swipe right to ignite new connections.</p>
            <p className="mt-2 text-xs uppercase tracking-[0.35em] text-gray-600">Awaiting matches</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {matches.map((match) => (
              <motion.button
                key={match.id}
                onClick={() => handleMatchClick(match)}
                className="flex w-full items-center gap-3 rounded-2xl border border-gray-300 bg-gray-300 px-4 py-3 text-left shadow-md transition hover:-translate-y-0.5 hover:bg-gray-400 hover:border-gray-400"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="relative">
                  <Image
                    src={match.image}
                    alt={match.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full border-2 border-gray-400 object-cover shadow"
                  />
                  <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 ring-4 ring-gray-200"></span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900">{match.name}</h4>
                  <p className="text-xs text-gray-700">Click to chat</p>
                </div>
                <motion.span
                  className="rounded-full bg-gray-500 px-2 py-0.5 text-xs font-medium text-white"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  new
                </motion.span>
              </motion.button>
            ))}
          </div>
        )}
      </aside>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex justify-center">
          {/* Swipe Section */}
          <div className="w-full max-w-md">
            <div className="mb-4 text-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Practice Your Rizz! 💬
              </h2>
              <p className="text-gray-700">Swipe right to match and start chatting</p>
            </div>

            <div className="relative w-full mx-auto" style={{ height: '600px' }}>
              {currentIndex < aiMatches.length ? (
                <SwipeCard
                  key={currentMatch.id}
                  match={currentMatch}
                  onSwipe={handleSwipe}
                  onCardClick={handleCardClick}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-white rounded-2xl shadow-2xl">
                  <div className="text-center p-8">
                    <h3 className="text-2xl font-bold mb-4">No more matches!</h3>
                    <p className="text-gray-600 mb-6">You've seen everyone. Start over?</p>
                    <button
                      onClick={() => setCurrentIndex(0)}
                      className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-semibold hover:shadow-lg transition"
                    >
                      Start Over
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {currentIndex < aiMatches.length && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={handleInfo}
                  className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition transform"
                  title="View Info"
                >
                  <Info className="text-2xl text-blue-500 hover:text-blue-700 transition duration-200" />
                </button>
                <button
                  onClick={() => handleSwipe('left')}
                  className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition transform"
                  title="Pass"
                >
                  <X className="text-2xl text-gray-500 hover:text-gray-700 transition duration-200" />
                </button>
                <button
                  onClick={handleStar}
                  className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition transform"
                  title="Super Like"
                >
                  <Star className="text-2xl text-yellow-400 hover:text-yellow-500 transition duration-200" fill="currentColor" />
                </button>
                <button
                  onClick={() => handleSwipe('right')}
                  className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition transform"
                  title="Like"
                >
                  <Heart className="text-2xl text-red-500 hover:text-red-700 transition duration-200" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
