'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, X } from 'lucide-react'
import Link from 'next/link'

export default function PeopleSearch({ familyId }: { familyId: string }) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<any[]>([])
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
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
  }, [query, familyId])

  function open() {
    setExpanded(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function close() {
    setExpanded(false)
    setQuery('')
    setResults([])
  }

  return (
    <div className="relative flex items-center">
      {/* Mobile: icon-only button that expands to a full input */}
      <div className={`
        flex items-center gap-1.5 overflow-hidden transition-all duration-200
        ${expanded ? 'w-44 sm:w-52' : 'w-8'}
        md:w-48
      `}>
        {/* Search icon — tap to expand on mobile */}
        <button
          onClick={open}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors md:hidden"
          aria-label="Search"
        >
          <Search size={16} />
        </button>

        {/* Input — always visible on desktop, shown when expanded on mobile */}
        <input
          ref={inputRef}
          type="text"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => { if (!query) close() }}
          className={`
            border border-gray-200 rounded-lg px-3 py-1.5 text-sm
            focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gray-50 focus:bg-white
            transition-all placeholder:text-gray-400
            ${expanded ? 'flex w-full' : 'hidden'}
            md:flex md:w-48
          `}
        />

        {/* Clear button when expanded with text */}
        {expanded && query && (
          <button
            onMouseDown={(e) => { e.preventDefault(); close() }}
            className="shrink-0 text-gray-400 hover:text-gray-600 md:hidden"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Desktop clear button */}
      {query && (
        <button
          onMouseDown={(e) => { e.preventDefault(); setQuery(''); setResults([]) }}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={13} />
        </button>
      )}

      {/* Results dropdown */}
      {results.length > 0 && (
        <ul className="absolute top-full mt-1 right-0 bg-white border border-gray-200 shadow-lg rounded-xl w-56 z-50 overflow-hidden">
          {results.map((p) => (
            <li key={p.id} className="hover:bg-gray-50">
              <Link
                href={`/dashboard/people/${p.id}`}
                onClick={close}
                className="block px-4 py-2.5 text-sm text-gray-800"
              >
                {p.first_name} {p.last_name}{p.nick_name ? ` (${p.nick_name})` : ''}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
