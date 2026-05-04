'use client'
import { useState } from 'react'
import { Handle, Position } from 'reactflow'
import Link from 'next/link'
import { getAvatarUrl } from '@/lib/avatar'

// ── helpers ────────────────────────────────────────────────────────────────

function getInitials(first: string, last?: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

// Warm, earthy palette — each entry is [accent, lightBg]
const PALETTE: [string, string][] = [
  ['#f59e0b', '#fef3c7'], // amber
  ['#10b981', '#d1fae5'], // emerald
  ['#3b82f6', '#dbeafe'], // blue
  ['#8b5cf6', '#ede9fe'], // violet
  ['#f43f5e', '#ffe4e6'], // rose
  ['#ea580c', '#ffedd5'], // orange
  ['#0d9488', '#ccfbf1'], // teal
]

function getPalette(seed: string): [string, string] {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff
  return PALETTE[h % PALETTE.length]
}

const SOCIAL: Record<string, { abbr: string; bg: string; fg: string }> = {
  facebook:  { abbr: 'fb', bg: '#e7f0fd', fg: '#1877f2' },
  instagram: { abbr: 'ig', bg: '#fce4ec', fg: '#e1306c' },
  linkedin:  { abbr: 'in', bg: '#e8f4fb', fg: '#0077b5' },
  twitter:   { abbr: 'x',  bg: '#f1f5f9', fg: '#334155' },
}

// ── component ──────────────────────────────────────────────────────────────

export default function PersonNode({ data }: { data: any }) {
  const seed = `${data.first_name ?? ''}${data.last_name ?? ''}`
  const [accent, lightBg] = getPalette(seed)
  const initials = getInitials(data.first_name, data.last_name)
  const birthYear = data.birth_date
    ? new Date(data.birth_date).getFullYear()
    : null
  const hasSocial = data.social_links?.length > 0

  // Avatar: uploaded photo > social-derived photo > initials
  const avatarUrl = getAvatarUrl(data.avatar_url, data.social_links)
  const [imgError, setImgError] = useState(false)
  const showAvatar = !!avatarUrl && !imgError

  return (
    <div
      className="rounded-2xl bg-white overflow-hidden hover:shadow-xl transition-shadow duration-200"
      style={{
        minWidth: 190,
        maxWidth: 230,
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        border: `1.5px solid ${accent}33`,
      }}
    >
      {/* Top accent stripe */}
      <div style={{ background: accent, height: 4 }} />

      <Handle
        type="target"
        position={Position.Top}
        style={{ background: accent, width: 8, height: 8, border: '2px solid white', top: 4 }}
      />
      {/* Side handles — used for the horizontal spouse/partner line */}
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        style={{ opacity: 0, width: 4, height: 4, right: 0, top: '50%' }}
      />
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        style={{ opacity: 0, width: 4, height: 4, left: 0, top: '50%' }}
      />

      <Link href={`/dashboard/people/${data.id}`} className="block px-4 py-3 group">
        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-full text-sm font-bold shrink-0 overflow-hidden"
            style={{
              width: 40,
              height: 40,
              background: lightBg,
              color: accent,
              boxShadow: `0 0 0 2px ${accent}55`,
            }}
          >
            {showAvatar ? (
              <img
                src={avatarUrl!}
                alt={initials}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              initials
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div
              className="text-sm font-semibold text-gray-900 truncate leading-snug group-hover:underline"
              style={{ textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
            >
              {data.first_name} {data.last_name}
            </div>

            {data.nick_name && (
              <div className="text-xs text-gray-400 truncate">
                &ldquo;{data.nick_name}&rdquo;
              </div>
            )}

            {birthYear && (
              <div className="text-[11px] text-gray-400 mt-0.5">
                b.&thinsp;{birthYear}
              </div>
            )}
          </div>
        </div>

        {/* Social link pills */}
        {hasSocial && (
          <div className="flex gap-1 mt-2.5 flex-wrap">
            {(data.social_links as any[]).slice(0, 5).map((link, i) => {
              const cfg = SOCIAL[link.platform]
              return (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide hover:opacity-75 transition-opacity"
                  style={
                    cfg
                      ? { background: cfg.bg, color: cfg.fg }
                      : { background: '#f1f5f9', color: '#64748b' }
                  }
                  title={link.platform === 'custom' ? (link.label || link.url) : link.platform}
                >
                  {cfg ? cfg.abbr : (link.label || '↗')}
                </a>
              )
            })}
          </div>
        )}
      </Link>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: accent, width: 8, height: 8, border: '2px solid white' }}
      />
    </div>
  )
}
