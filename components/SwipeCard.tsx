'use client';

import { AIMatch } from '@/types';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useState } from 'react';
import { Heart, X } from 'lucide-react';

interface SwipeCardProps {
  match: AIMatch;
  onSwipe: (direction: 'left' | 'right') => void;
  onCardClick: () => void;
}

export default function SwipeCard({ match, onSwipe, onCardClick }: SwipeCardProps) {
  const [exitX, setExitX] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 150) {
      setExitX(info.offset.x > 0 ? 300 : -300);
      onSwipe(info.offset.x > 0 ? 'right' : 'left');
    }
  };

  return (
    <motion.div
      className="absolute w-full h-full cursor-grab active:cursor-grabbing"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={{ x: exitX }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={onCardClick}
    >
      <div className="relative w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Image */}
        <div className="h-2/3 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
          <img
            src={match.image}
            alt={match.name}
            className="w-48 h-48 object-cover"
          />
        </div>

        {/* Info */}
        <div className="p-6 h-1/3">
          <h2 className="text-2xl font-bold mb-1">
            {match.name}, {match.age}
          </h2>
          <p className="text-gray-600 text-sm mb-3">{match.bio}</p>
          <div className="flex flex-wrap gap-2">
            {match.interests.slice(0, 3).map((interest) => (
              <span
                key={interest}
                className="px-3 py-1 bg-pink-100 text-pink-600 rounded-full text-xs"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>

        {/* Swipe indicators */}
        <motion.div
          className="absolute top-8 right-8 text-green-500 font-bold text-6xl border-4 border-green-500 rounded-xl px-4 py-2 rotate-12"
          style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
        >
          MATCH
        </motion.div>
        <motion.div
          className="absolute top-8 left-8 text-red-500 font-bold text-6xl border-4 border-red-500 rounded-xl px-4 py-2 -rotate-12"
          style={{ opacity: useTransform(x, [-100, 0], [1, 0]) }}
        >
          NOPE
        </motion.div>
      </div>
    </motion.div>
  );
}
