'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function PeopleSearch({ familyId }: { familyId: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('people')
        .select('id, first_name, last_name, nick_name')
        .eq('family_id', familyId)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,nick_name.ilike.%${query}%`)
        .limit(5)
      setResults(data ?? [])
    }, 200)
    return () => clearTimeout(timer)
  }, [query, familyId, supabase])

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search name or nickname..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border rounded-md px-3 py-1 text-sm w-48 focus:outline-none"
      />
      {results.length > 0 && (
        <ul className="absolute top-full mt-1 left-0 bg-white border shadow-lg rounded-md w-full z-50">
          {results.map((p) => (
            <li key={p.id} className="hover:bg-gray-50">
              <Link href={`/dashboard/people/${p.id}`} className="block px-3 py-2 text-sm">
                {p.first_name} {p.last_name} {p.nick_name && `(${p.nick_name})`}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
