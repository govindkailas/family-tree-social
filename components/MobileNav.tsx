'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, UserPlus, Users, ClipboardList, TreePine, CalendarDays } from 'lucide-react'
import SendInviteModal from './SendInviteModal'

type Props = {
  isOwner:      boolean
  pendingCount: number
  familyId:     string | null
  userId:       string | null
}

export default function MobileNav({ isOwner, pendingCount, familyId, userId }: Props) {
  const [open, setOpen]           = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close menu on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Close menu when clicking outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <>
      <div ref={ref} className="relative md:hidden">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        {open && (
          <div className="absolute right-0 top-11 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-2 z-50">
            <Link
              href="/dashboard/people/new"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <UserPlus size={15} className="text-gray-400" />
              Add Person
            </Link>

            <Link
              href="/dashboard/invite"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <TreePine size={15} className="text-gray-400" />
              Invite to Family
            </Link>

            {familyId && userId && (
              <button
                onClick={() => { setOpen(false); setEventOpen(true) }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
              >
                <CalendarDays size={15} className="text-gray-400" />
                Event Invite
              </button>
            )}

            {isOwner && (
              <>
                <div className="my-1.5 border-t border-gray-100" />
                <Link
                  href="/dashboard/members"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Users size={15} className="text-gray-400" />
                  Members
                </Link>
                <Link
                  href="/dashboard/pending"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ClipboardList size={15} className="text-gray-400" />
                  Requests
                  {pendingCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white px-1">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {eventOpen && familyId && userId && (
        <SendInviteModal
          familyId={familyId}
          userId={userId}
          onClose={() => setEventOpen(false)}
        />
      )}
    </>
  )
}
