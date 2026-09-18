'use client'

import { useMemo, useRef, useState } from 'react'
import { IconStack2, IconX } from '@tabler/icons-react'
import { TECH_OPTIONS, findTechIcon } from '@/lib/tech-icons'

const inputClass = 'bg-[#111] border border-[#1a1a1a] rounded-lg py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22d3ee] transition-colors w-full'
const MAX_SUGGESTIONS = 8

/** Buscador con autocompletado para el stack: escribís, Tab/Enter agrega, con ícono de marca cuando lo conocemos */
export function TechStackPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedLower = useMemo(() => new Set(value.map((tech) => tech.toLowerCase())), [value])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return TECH_OPTIONS
      .filter((tech) => tech.name.toLowerCase().includes(q) && !selectedLower.has(tech.name.toLowerCase()))
      .slice(0, MAX_SUGGESTIONS)
  }, [query, selectedLower])

  const addTech = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || selectedLower.has(trimmed.toLowerCase())) return
    onChange([...value, trimmed])
    setQuery('')
    setActiveIndex(0)
  }

  const removeTech = (name: string) => {
    onChange(value.filter((tech) => tech !== name))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(suggestions.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (!query.trim()) return
      e.preventDefault()
      const picked = suggestions[activeIndex]?.name ?? query
      addTech(picked)
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      removeTech(value[value.length - 1])
    } else if (e.key === 'Escape') {
      setQuery('')
    }
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className="text-xs text-gray-500 font-[var(--font-fira-code)]">
        <span className="inline-flex items-center gap-1.5"><IconStack2 size={14} className="text-gray-600" />Stack</span>
      </label>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tech) => {
            const Icon = findTechIcon(tech)
            return (
              <span
                key={tech}
                className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 text-xs font-mono bg-[#111] border border-[#1a1a1a] text-gray-200 rounded-md"
              >
                {Icon && <Icon size={12} className="text-[#22d3ee]" />}
                {tech}
                <button
                  type="button"
                  onClick={() => removeTech(tech)}
                  className="cursor-pointer p-0.5 rounded hover:bg-[#1a1a1a] text-gray-500 hover:text-red-400 transition-colors"
                  aria-label={`Quitar ${tech}`}
                >
                  <IconX size={11} />
                </button>
              </span>
            )
          })}
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar tecnología… Next.js, TypeScript, Supabase"
          className={`${inputClass} px-3`}
        />

        {suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full bg-[#111] border border-[#1a1a1a] rounded-lg overflow-hidden shadow-lg">
            {suggestions.map((tech, i) => (
              <li key={tech.name}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTech(tech.name)}
                  className={`w-full cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                    i === activeIndex ? 'bg-[#1a1a1a] text-white' : 'text-gray-300 hover:bg-[#1a1a1a]'
                  }`}
                >
                  <tech.Icon size={14} className="text-[#22d3ee] shrink-0" />
                  {tech.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
