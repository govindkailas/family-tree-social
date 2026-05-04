'use client'
import { useState } from 'react'
import { Mail } from 'lucide-react'
import SendInviteModal from './SendInviteModal'

interface Props {
  familyId: string
  userId: string
}

export default function SendInviteButton({ familyId, userId }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        <Mail size={14} />
        Send Invite
      </button>

      {open && (
        <SendInviteModal
          familyId={familyId}
          userId={userId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
