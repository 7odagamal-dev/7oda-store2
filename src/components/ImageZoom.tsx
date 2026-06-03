'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface ImageZoomProps {
  src: string;
  alt: string;
}

export default function ImageZoom({ src, alt }: ImageZoomProps) {
  const [showZoom, setShowZoom] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x, y });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-crosshair"
      onMouseEnter={() => setShowZoom(true)}
      onMouseLeave={() => setShowZoom(false)}
      onMouseMove={handleMouseMove}
    >
      <Image src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover pointer-events-none" priority />
      {showZoom && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: '250%',
            backgroundPosition: `${pos.x}% ${pos.y}%`,
          }}
        />
      )}
    </div>
  );
}
