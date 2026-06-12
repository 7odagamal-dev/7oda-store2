'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';

interface ImageZoomProps {
  src: string;
  alt: string;
}

export default function ImageZoom({ src, alt }: ImageZoomProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => { setIsTouchDevice(typeof window !== 'undefined' && 'ontouchstart' in window); }, []);
  const [showZoom, setShowZoom] = useState(false);
  const [touchZoom, setTouchZoom] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || touchZoom) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x, y });
  };

  const handleTouchStart = useCallback(() => {
    if (!isTouchDevice) return;
    const timer = setTimeout(() => {
      setTouchZoom(true);
      setShowZoom(true);
    }, 500);
    setLongPressTimer(timer);
  }, [isTouchDevice]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    if (!touchZoom || !containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    setPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, [touchZoom, longPressTimer]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    if (touchZoom) {
      setTouchZoom(false);
      setShowZoom(false);
    }
  }, [touchZoom, longPressTimer]);

  const handleTap = useCallback(() => {
    if (!isTouchDevice) return;
    if (!touchZoom) {
      setTouchZoom(true);
      setShowZoom(true);
    } else {
      setTouchZoom(false);
      setShowZoom(false);
    }
  }, [isTouchDevice, touchZoom]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-crosshair select-none"
      onMouseEnter={() => { if (!isTouchDevice) setShowZoom(true); }}
      onMouseLeave={() => { if (!isTouchDevice) { setShowZoom(false); setPos({ x: 50, y: 50 }); }}}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleTap}
      role="img"
      aria-label={alt}
    >
      <Image src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover pointer-events-none" priority draggable={false} />
      {isTouchDevice && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full whitespace-nowrap pointer-events-none opacity-0 sm:opacity-100 transition-opacity">
          {touchZoom ? 'Drag to explore • Tap to close' : 'Hold to zoom'}
        </div>
      )}
      {showZoom && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: touchZoom ? '200%' : '250%',
            backgroundPosition: `${pos.x}% ${pos.y}%`,
          }}
        />
      )}
    </div>
  );
}
