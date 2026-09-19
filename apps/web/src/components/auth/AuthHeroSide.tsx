'use client';

import { useState, useEffect } from 'react';

interface MotivationalQuote {
  quote: string;
  tags: string[];
  glowColor: string;
}

const QUOTES: MotivationalQuote[] = [
  {
    quote: '“Every rep counts. Show up for yourself.”',
    tags: ['DISCIPLINE', 'CONSISTENCY', 'PROGRESS'],
    glowColor: 'rgba(59, 130, 246, 0.25)', // Blue
  },
  {
    quote: '“The pain you feel today will be the strength you feel tomorrow.”',
    tags: ['STRENGTH', 'RESILIENCE', 'GROWTH'],
    glowColor: 'rgba(16, 185, 129, 0.25)', // Emerald
  },
  {
    quote: '“You don\'t have to be extreme, just relentlessly consistent.”',
    tags: ['MOMENTUM', 'HABIT', 'MASTERY'],
    glowColor: 'rgba(245, 158, 11, 0.25)', // Amber
  },
  {
    quote: '“Excuses don\'t build muscle. Action does.”',
    tags: ['DETERMINATION', 'GRIT', 'RESULTS'],
    glowColor: 'rgba(244, 63, 94, 0.25)', // Rose
  },
  {
    quote: '“The only limit is the one you decide to accept.”',
    tags: ['POTENTIAL', 'COURAGE', 'POWER'],
    glowColor: 'rgba(168, 85, 247, 0.25)', // Purple
  },
  {
    quote: '“Action cures fear. Motion creates momentum.”',
    tags: ['MINDSET', 'ENERGY', 'FOCUS'],
    glowColor: 'rgba(6, 182, 212, 0.25)', // Cyan
  },
];

// Automatically rotates every 2.6 seconds (within 2-3 sec gap)
const ROTATION_INTERVAL_MS = 2600;

export default function AuthHeroSide() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      // Begin exit transition
      setIsTransitioning(true);

      // Halfway through, update to the next quote and trigger entrance transition
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % QUOTES.length);
        setIsTransitioning(false);
      }, 280);
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  const current = QUOTES[currentIndex];

  return (
    <div className="relative hidden md:flex md:w-1/2 lg:w-3/5 min-h-screen flex-col justify-end items-center bg-black overflow-hidden select-none">
      {/* Background Hero Image - completely uncropped */}
      <img
        src="/auth-hero.jpg"
        alt="Workout Motivation"
        className="absolute inset-0 h-full w-full object-contain pointer-events-none"
      />

      {/* Cinematic gradient overlays for contrast & seamless black blend */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-80 bg-gradient-to-t from-black via-black/85 to-transparent pointer-events-none" />

      {/* Dynamic ambient color glow that morphs smoothly behind each quote */}
      <div
        className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[520px] h-[260px] rounded-full pointer-events-none transition-all duration-1000 blur-3xl"
        style={{
          background: `radial-gradient(ellipse at center, ${current.glowColor}, transparent 70%)`,
        }}
      />

      {/* Motivational Quote Container — clean, focused, smoothly changing */}
      <div className="relative z-10 pb-12 lg:pb-16 px-6 lg:px-14 w-full max-w-2xl flex flex-col items-center text-center">
        {/* Animated Quote text */}
        <div className="min-h-[100px] flex items-center justify-center px-4">
          <h2
            className={`text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white drop-shadow-xl leading-snug transition-all duration-300 ease-out ${
              isTransitioning
                ? 'opacity-0 -translate-y-4 blur-sm scale-[0.97]'
                : 'opacity-100 translate-y-0 blur-0 scale-100'
            }`}
          >
            {current.quote}
          </h2>
        </div>

        {/* Tags row with subtle bullet separation */}
        <div
          className={`flex items-center justify-center gap-2 mt-4 flex-wrap transition-all duration-300 delay-75 ease-out ${
            isTransitioning ? 'opacity-0 translate-y-2 blur-xs' : 'opacity-100 translate-y-0 blur-0'
          }`}
        >
          {current.tags.map((tag, idx) => (
            <span
              key={tag}
              className="inline-flex items-center text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-zinc-300/90 drop-shadow-md"
            >
              {tag}
              {idx < current.tags.length - 1 && (
                <span className="mx-2 text-zinc-600 font-bold">&bull;</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
