'use client'

import { useState, useEffect } from 'react'

export default function PWAInstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [showIOS, setShowIOS] = useState(false)

  useEffect(() => {
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    )
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsStandalone(standalone)

    if (!standalone && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream) {
      setTimeout(() => setShowIOS(true), 5000)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstall(true)
    }
    ;(window as any).addEventListener('beforeinstallprompt', handler)
    return () => (window as any).removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    const promptEvent = deferredPrompt as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }
    promptEvent.prompt()
    const result = await promptEvent.userChoice
    if (result.outcome === 'accepted') setShowInstall(false)
    setDeferredPrompt(null)
  }

  if (isStandalone) return null

  return (
    <>
      {showInstall && !isIOS && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-[380px] z-50 bg-white dark:bg-[#1A1D24] border border-[#E5E7EB] dark:border-[#2D3748] rounded-2xl p-5 shadow-lg animate-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8BA4B8]/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#8BA4B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1A1A1A] dark:text-[#E5E7EB]">Install 7H </p>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">Add to your home screen for the best experience</p>
            </div>
            <button onClick={() => setShowInstall(false)} className="text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#E5E7EB] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <button onClick={handleInstall} className="mt-3 w-full py-2.5 bg-[#1A1A1A] dark:bg-[#374151] text-white text-sm font-semibold rounded-xl hover:bg-[#333] dark:hover:bg-[#4B5563] transition-all">
            Install App
          </button>
        </div>
      )}

      {showIOS && isIOS && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-[380px] z-50 bg-white dark:bg-[#1A1D24] border border-[#E5E7EB] dark:border-[#2D3748] rounded-2xl p-5 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8BA4B8]/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#8BA4B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0l3 0m-6.75 15.75h7.5" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1A1A1A] dark:text-[#E5E7EB]">Install on iOS</p>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                Tap <span className="inline-flex items-center px-1 py-0.5 bg-[#F3F5F8] dark:bg-[#252830] rounded text-[10px] font-medium">Share</span> then <span className="inline-flex items-center px-1 py-0.5 bg-[#F3F5F8] dark:bg-[#252830] rounded text-[10px] font-medium">Add to Home Screen</span>
              </p>
            </div>
            <button onClick={() => setShowIOS(false)} className="text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#E5E7EB] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
