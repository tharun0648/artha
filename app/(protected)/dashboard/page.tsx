'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAnalyzing = searchParams.get('analyzing') === 'true'
  const [dots, setDots] = useState('.')

  useEffect(() => {
    if (!isAnalyzing) return
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '.' : d + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [isAnalyzing])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-[#f8f7ff] flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-[#1e1847]/10 flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-3 border-[#1e1847] border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-[#1e1847] mb-2">
            Building your Financial Twin{dots}
          </h2>
          <p className="text-sm text-gray-500">
            Running causal attribution analysis on your financial data. This takes just a moment.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff] px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-[#1e1847]">A₹tha</h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 transition"
          >
            Sign out
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-lg font-semibold text-gray-800 mb-2">Your Dashboard</p>
          <p className="text-sm text-gray-500">
            Full verdict, health score, and causal analysis coming in Phase 4.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f7ff] flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
