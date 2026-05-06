'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Silently polls every 8 seconds by refreshing the server component.
 * The pending page server component will redirect to /dashboard as soon
 * as family_members contains the user's row.
 */
export default function CheckApproval() {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 8000)
    return () => clearInterval(id)
  }, [router])

  return (
    <button
      onClick={() => router.refresh()}
      className="text-xs text-amber-600 hover:text-amber-800 underline underline-offset-2 transition-colors"
    >
      Check now
    </button>
  )
}
