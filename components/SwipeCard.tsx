'use client';

import { AIMatch } from '@/types';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';

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
      <div className="bg-white rounded-xl p-6 my-4 mx-2 shadow-xl transform transition duration-300 hover:scale-105 relative w-full h-full overflow-hidden flex flex-col">
        {/* Image */}
        <div className="relative rounded-xl h-3/4 w-full overflow-hidden shadow-lg mb-4">
          <Image
            src={match.image}
            alt={match.name}
            fill
            sizes="(max-width: 768px) 90vw, 420px"
            className="object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col">
          <h2 className="text-xl font-semibold text-gray-800 mb-1">
            {match.name}, {match.age}
          </h2>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{match.bio}</p>
          <p className="text-xs text-gray-500">2 miles away</p>
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
