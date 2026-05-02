'use client'
import { Plus, Trash2 } from 'lucide-react'

const platforms = ['facebook', 'instagram', 'linkedin', 'twitter', 'custom'] as const

type SocialLink = {
  platform: string
  url: string
  label?: string
}

interface Props {
  links: SocialLink[]
  onChange: (links: SocialLink[]) => void
}

export default function SocialLinksEditor({ links, onChange }: Props) {
  const addLink = () => {
    onChange([...links, { platform: 'custom', url: '', label: '' }])
  }

  const updateLink = (index: number, field: string, value: string) => {
    const updated = [...links]
    ;(updated[index] as any)[field] = value
    onChange(updated)
  }

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {links.map((link, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <select
            value={link.platform}
            onChange={(e) => updateLink(idx, 'platform', e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            type="url"
            placeholder="URL"
            value={link.url}
            onChange={(e) => updateLink(idx, 'url', e.target.value)}
            className="border rounded px-2 py-1 flex-1 text-sm"
          />
          {link.platform === 'custom' && (
            <input
              type="text"
              placeholder="Label"
              value={link.label || ''}
              onChange={(e) => updateLink(idx, 'label', e.target.value)}
              className="border rounded px-2 py-1 w-28 text-sm"
            />
          )}
          <button onClick={() => removeLink(idx)} type="button">
            <Trash2 size={16} className="text-red-500" />
          </button>
        </div>
      ))}
      <button
        onClick={addLink}
        type="button"
        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
      >
        <Plus size={14} /> Add social link
      </button>
    </div>
  )
}
