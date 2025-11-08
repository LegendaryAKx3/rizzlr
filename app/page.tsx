'use client';

import { useState } from 'react';
import { aiMatches } from '@/lib/aiMatches';
import { AIMatch } from '@/types';
import SwipeCard from '@/components/SwipeCard';
import ChatInterface from '@/components/ChatInterface';
import { Heart, X, MessageCircle, Sparkles } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState<AIMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<AIMatch | null>(null);
  const [showChat, setShowChat] = useState(false);

  const currentMatch = aiMatches[currentIndex];

  const handleSwipe = (direction: 'left' | 'right') => {
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

  const handleMatchClick = (match: AIMatch) => {
    setSelectedMatch(match);
    setShowChat(true);
  };

  if (showChat && selectedMatch) {
    return <ChatInterface match={selectedMatch} onBack={() => setShowChat(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-pink-500" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Rizzlr
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-gray-600" />
            <span className="font-semibold">{matches.length}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Swipe Section */}
          <div className="lg:col-span-2">
            <div className="mb-4 text-center">
              <h2 className="text-xl font-semibold text-gray-800">
                Practice Your Rizz! 💬
              </h2>
              <p className="text-gray-600">Swipe right to match and start chatting</p>
            </div>

            <div className="relative w-full max-w-md mx-auto" style={{ height: '600px' }}>
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
              <div className="flex justify-center gap-8 mt-8">
                <button
                  onClick={() => handleSwipe('left')}
                  className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition transform"
                >
                  <X className="w-8 h-8 text-red-500" />
                </button>
                <button
                  onClick={() => handleSwipe('right')}
                  className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition transform"
                >
                  <Heart className="w-8 h-8 text-pink-500" />
                </button>
              </div>
            )}
          </div>

          {/* Matches Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                Your Matches ({matches.length})
              </h3>
              
              {matches.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No matches yet. Start swiping!
                </p>
              ) : (
                <div className="space-y-3">
                  {matches.map((match) => (
                    <button
                      key={match.id}
                      onClick={() => handleMatchClick(match)}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-pink-50 transition"
                    >
                      <img
                        src={match.image}
                        alt={match.name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="flex-1 text-left">
                        <h4 className="font-semibold">{match.name}</h4>
                        <p className="text-sm text-gray-500">Click to chat</p>
                      </div>
                      <MessageCircle className="w-5 h-5 text-pink-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tips Section */}
            <div className="mt-6 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-bold mb-3">💡 Pro Tips</h3>
              <ul className="space-y-2 text-sm">
                <li>• Be genuine and authentic</li>
                <li>• Ask interesting questions</li>
                <li>• Show interest in their hobbies</li>
                <li>• Use humor appropriately</li>
                <li>• Practice makes perfect!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
