'use client'
import { useState, useEffect } from 'react'
import { LayoutList, Network } from 'lucide-react'
import FamilyTreeList from './FamilyTreeList'
import FamilyTreeD3 from './FamilyTreeD3'

// ── view detection ─────────────────────────────────────────────────────────

/** Returns true on mobile widths, null during SSR / first paint. */
function useIsMobile(breakpoint = 768): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])

  return isMobile
}

// ── FamilyTree (wrapper) ───────────────────────────────────────────────────

type View = 'list' | 'canvas'

export default function FamilyTree({
  people,
  relationships,
}: {
  people: any[]
  relationships: any[]
}) {
  const isMobile = useIsMobile()
  // null = follow device; set explicitly when user clicks toggle
  const [userView, setUserView] = useState<View | null>(null)

  // Derived active view: user override > device default
  // While isMobile is null (SSR / first frame) default to list
  const autoView: View = isMobile === null ? 'list' : isMobile ? 'list' : 'canvas'
  const activeView: View = userView ?? autoView

  // Empty state (shared between both views)
  if (people.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
        <span className="text-5xl">🌱</span>
        <p className="text-sm font-medium">Your family tree is empty.</p>
        <p className="text-xs">Add the first person to get started.</p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      {/* ── View toggle ──────────────────────────────────────────────────── */}
      <div className="absolute top-3 right-3 z-10 flex bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <button
          onClick={() => setUserView('list')}
          title="List view"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            activeView === 'list'
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <LayoutList size={13} />
          <span className="hidden sm:inline">List</span>
        </button>
        <button
          onClick={() => setUserView('canvas')}
          title="Tree canvas"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            activeView === 'canvas'
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Network size={13} />
          <span className="hidden sm:inline">Tree</span>
        </button>
      </div>

      {/* ── Active view ──────────────────────────────────────────────────── */}
      {activeView === 'list' ? (
        <FamilyTreeList people={people} relationships={relationships} />
      ) : (
        <FamilyTreeD3 people={people} relationships={relationships} />
      )}
    </div>
  )
}
