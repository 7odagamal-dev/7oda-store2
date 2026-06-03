'use client';

import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  endsAt: string;
  compact?: boolean;
}

export default function CountdownTimer({ endsAt, compact = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    function tick() {
      const now = Date.now();
      const end = new Date(endsAt).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setEnded(true);
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (ended) return null;

  if (compact) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
      <span className="font-mono text-xs tabular-nums">
        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-[#6B7280]">Sale ends in</span>
      <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums">
        {timeLeft.days > 0 && (
          <>
            <span className="bg-[#1A1A1A] text-white px-2 py-1 rounded-md">{timeLeft.days}d</span>
            <span className="text-[#9CA3AF]">:</span>
          </>
        )}
        <span className="bg-[#1A1A1A] text-white px-2 py-1 rounded-md min-w-[26px] text-center">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="text-[#9CA3AF]">:</span>
        <span className="bg-[#1A1A1A] text-white px-2 py-1 rounded-md min-w-[26px] text-center">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-[#9CA3AF]">:</span>
        <span className="bg-[#1A1A1A] text-white px-2 py-1 rounded-md min-w-[26px] text-center">{String(timeLeft.seconds).padStart(2, '0')}</span>
      </div>
    </div>
  );
}
