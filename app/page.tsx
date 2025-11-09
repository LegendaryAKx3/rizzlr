'use client';

import { useState, useEffect } from 'react';
import { useUser, useClerk, UserButton, SignedIn } from '@clerk/nextjs';
import { aiMatches } from '@/lib/aiMatches';
import { AIMatch, UserCard } from '@/types';
import SwipeCard from '@/components/SwipeCard';
import ChatInterface from '@/components/ChatInterface';
import OnboardingFlow from '@/components/OnboardingFlow';
import { Heart, X, Star, Info, MessageCircle, Settings } from 'lucide-react';
import Image from 'next/image';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  createMatch,
  hasMatched,
  getActiveMatches,
  getOrCreateUserProfile,
  getPreferredGender
} from '@/lib/supabaseMatches';

// Fisher-Yates shuffle algorithm for randomizing array order
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function Home() {
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState<AIMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<AIMatch | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showMessagesSidebar, setShowMessagesSidebar] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [userCard, setUserCard] = useState<UserCard | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [filteredProfiles, setFilteredProfiles] = useState<AIMatch[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [shownProfileIds, setShownProfileIds] = useState<Set<string>>(new Set());

  const currentMatch = filteredProfiles[currentIndex];

  // Check if desktop on mount
  useEffect(() => {
    setIsDesktop(window.innerWidth >= 1024);
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      
      // Initialize user profile in Supabase
      getOrCreateUserProfile(user.id);
    } else {
      // User signed out - reset state
      setUserCard(null);
      setShowOnboarding(false);
    }
  }, [isSignedIn, user]);

  // Load user's matches from Supabase and filter profiles by preference
  useEffect(() => {
    const loadMatchesAndFilterProfiles = async () => {
      if (!isSignedIn || !user) {
        // If user is not signed in, show all profiles randomized
        const shuffled = shuffleArray([...aiMatches]);
        setFilteredProfiles(shuffled);
        setIsLoadingMatches(false);
        return;
      }
      
      setIsLoadingMatches(true);
      try {
        // Get user's gender preference
        const { data: preferredGender } = await getPreferredGender(user.id);
        
        // Filter profiles based on preference
        let filtered = aiMatches;
        if (preferredGender && preferredGender !== 'both') {
          filtered = aiMatches.filter(profile => profile.gender === preferredGender);
        }
        
        // Shuffle the filtered profiles
        const shuffled = shuffleArray([...filtered]);
        setFilteredProfiles(shuffled);
        
        // Load existing matches from Supabase
        const { data: savedMatches } = await getActiveMatches(user.id);
        if (savedMatches) {
          const matchedProfiles = savedMatches.map(match => ({
            id: match.profile_id.toString(),
            name: match.profile_name,
            age: match.profile_age || 20,
            bio: match.profile_bio || '',
            interests: match.profile_interests || [],
            personality: '',
            image: match.profile_image || '',
            conversationStyle: '',
            gender: match.profile_gender
          })) as AIMatch[];
          setMatches(matchedProfiles);
        }
      } catch (error) {
        console.error('Error loading matches:', error);
      } finally {
        setIsLoadingMatches(false);
      }
    };

    loadMatchesAndFilterProfiles();
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

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!checkAuthAndOnboarding()) return;
    if (!user) return;

    // Mark current profile as shown
    setShownProfileIds(prev => new Set([...prev, currentMatch.id]));

    if (direction === 'right') {
      // Check if already matched
      const { matched } = await hasMatched(user.id, parseInt(currentMatch.id));
      
      if (!matched) {
        // Save match to Supabase
        try {
          await createMatch(
            user.id,
            parseInt(currentMatch.id),
            currentMatch.name,
            currentMatch.age,
            currentMatch.gender,
            currentMatch.bio,
            currentMatch.image,
            currentMatch.interests
          );
          
          // Add to local state
          setMatches([...matches, currentMatch]);
          
          toast.success(`It's a match with ${currentMatch.name}! 💕`, {
            icon: '🎉',
            duration: 2000,
          });
        } catch (error) {
          console.error('Error creating match:', error);
          toast.error('Failed to save match');
        }
      } else {
        toast(`You've already matched with ${currentMatch.name}!`, {
          icon: '💕',
          duration: 2000,
        });
      }
    } else {
      toast(`${currentMatch.name} is looking for someone else`, {
        icon: '👋',
        duration: 1500,
      });
    }

    // Move to next profile, skipping any we've already shown
    setTimeout(() => {
      let nextIndex = (currentIndex + 1) % filteredProfiles.length;
      let attempts = 0;
      const maxAttempts = filteredProfiles.length;
      
      // Find next profile that hasn't been shown
      while (shownProfileIds.has(filteredProfiles[nextIndex]?.id) && attempts < maxAttempts) {
        nextIndex = (nextIndex + 1) % filteredProfiles.length;
        attempts++;
      }
      
      // If we've shown all profiles, show message and reset
      if (attempts >= maxAttempts) {
        toast('You\'ve seen all available profiles! Reshuffling...', {
          icon: '🔄',
          duration: 2500,
        });
        setShownProfileIds(new Set());
        // Reshuffle profiles
        const reshuffled = shuffleArray([...filteredProfiles]);
        setFilteredProfiles(reshuffled);
        setCurrentIndex(0);
      } else {
        setCurrentIndex(nextIndex);
      }
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
    setShowMessagesSidebar(false); // Close sidebar when opening chat
  };

  const handleMatchRemoved = async () => {
    // Reload matches after one is removed
    if (user) {
      const { data: savedMatches } = await getActiveMatches(user.id);
      if (savedMatches) {
        const matchedProfiles = savedMatches.map(match => ({
          id: match.profile_id.toString(),
          name: match.profile_name,
          age: match.profile_age || 20,
          bio: match.profile_bio || '',
          interests: match.profile_interests || [],
          personality: '',
          image: match.profile_image || '',
          conversationStyle: '',
          gender: match.profile_gender
        })) as AIMatch[];
        setMatches(matchedProfiles);
      }
    }
  };

  // Show onboarding if needed
  if (isSignedIn && showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (showChat && selectedMatch) {
    return (
      <ChatInterface 
        match={selectedMatch} 
        onBack={() => setShowChat(false)}
        onMatchRemoved={handleMatchRemoved}
      />
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 bg-gray-200 relative">
      {/* User Button - Only show when signed in */}
      <SignedIn>
        <div className="fixed top-6 left-6 z-50 flex gap-3">
          <UserButton afterSignOutUrl="/" />
          <button
            onClick={() => router.push('/settings')}
            className="w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg transition flex items-center justify-center"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </SignedIn>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: '999px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'rgba(20, 20, 20, 0.95)',
            color: '#fca5a5',
            boxShadow: '0 20px 40px rgba(239, 68, 68, 0.25)',
          },
        }}
      />

      {/* Floating Messages Button (Mobile) */}
      <button
        onClick={() => setShowMessagesSidebar(!showMessagesSidebar)}
        className="fixed bottom-6 right-6 z-50 lg:hidden w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
      >
        <MessageCircle className="w-7 h-7" />
        {matches.length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center">
            {matches.length}
          </span>
        )}
      </button>

      {/* Messages Sidebar - Desktop: Fixed right, Mobile: Slide-in overlay */}
      <AnimatePresence>
        {(showMessagesSidebar || isDesktop) && (
          <>
            {/* Backdrop for mobile */}
            {showMessagesSidebar && !isDesktop && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMessagesSidebar(false)}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              />
            )}
            
            {/* Sidebar */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-screen w-80 max-w-[85vw] rounded-l-[32px] lg:rounded-[32px] border border-gray-300 bg-gray-200 p-6 shadow-2xl z-50 overflow-y-auto lg:top-6 lg:right-6 lg:h-[calc(100vh-3rem)] lg:max-w-none"
            >
              <div className="flex items-center justify-between mb-6">
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
                <div className="space-y-3">
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
            </motion.aside>
          </>
        )}
      </AnimatePresence>

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
              {currentIndex < filteredProfiles.length && currentMatch ? (
                <SwipeCard
                  key={currentMatch.id}
                  match={currentMatch}
                  onSwipe={handleSwipe}
                  onCardClick={handleCardClick}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-white rounded-2xl shadow-2xl">
                  <div className="text-center p-8">
                    <h3 className="text-2xl font-bold mb-4">
                      {isLoadingMatches ? 'Loading profiles...' : 'No more matches!'}
                    </h3>
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
