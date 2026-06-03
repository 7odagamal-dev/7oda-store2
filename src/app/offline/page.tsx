export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] dark:bg-[#0F1115] px-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#8BA4B8]/10 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-[#8BA4B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 010-1.414" />
          </svg>
        </div>
        <h1 className="text-2xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] dark:text-[#E5E7EB] mb-2">You're Offline</h1>
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mb-8 leading-relaxed">
          Check your connection and try again. Some previously viewed pages may still be available.
        </p>
        <a href="/" className="inline-flex px-6 py-3 bg-[#8BA4B8] text-white rounded-xl text-sm font-semibold hover:bg-[#6B8BA0] transition-all">
          Go Home
        </a>
      </div>
    </div>
  )
}
