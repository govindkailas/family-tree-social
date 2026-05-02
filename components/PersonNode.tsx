import { Handle, Position } from 'reactflow'
import Link from 'next/link'

export default function PersonNode({ data }: { data: any }) {
  const platformIcons: Record<string, string> = {
    facebook: '📘',
    instagram: '📷',
    linkedin: '💼',
    twitter: '🐦',
  }

  return (
    <div className="px-4 py-2 shadow-lg rounded-xl bg-white border border-gray-200 min-w-[140px]">
      <Handle type="target" position={Position.Top} />
      <Link href={`/dashboard/people/${data.id}`} className="hover:underline">
        <div className="text-sm font-semibold text-gray-800">
          {data.first_name} {data.last_name}
        </div>
        {data.nick_name && (
          <div className="text-xs text-gray-400">"{data.nick_name}"</div>
        )}
      </Link>
      <div className="flex gap-1 mt-1">
        {data.social_links?.map((link: any, i: number) => (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg"
            title={link.platform}
          >
            {platformIcons[link.platform] || link.label || '🔗'}
          </a>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
