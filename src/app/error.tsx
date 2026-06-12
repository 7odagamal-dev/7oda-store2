'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
        <p className="text-gray-400 mb-8">
          An unexpected error occurred. Please try again or return to the homepage.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-[#d4af37] text-black font-semibold rounded-lg hover:bg-[#c9a432] transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:border-white hover:text-white transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
