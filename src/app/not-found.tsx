import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-[#d4af37] mb-4">404</div>
        <h1 className="text-3xl font-bold mb-4">Page Not Found</h1>
        <p className="text-gray-400 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-[#d4af37] text-black font-semibold rounded-lg hover:bg-[#c9a432] transition-colors"
          >
            Home
          </Link>
          <Link
            href="/shop"
            className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:border-white hover:text-white transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  );
}
