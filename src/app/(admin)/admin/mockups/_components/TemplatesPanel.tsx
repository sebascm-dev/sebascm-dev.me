'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SPRING, flyout, stagger, staggerItem } from './motion'
import { IconChevronRight, IconLayoutGrid, IconPhoto, IconX } from '@tabler/icons-react'
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  applyTemplate,
  type BackgroundContext,
  type MockupState,
  type Template,
} from '@/lib/mockup'
import { MockupCanvas, type SlotMedia } from './MockupCanvas'
import { useOutsideClick } from './ui'

type Props = {
  state: MockupState
  slots: SlotMedia[]
  palette: string[]
  background: BackgroundContext
  onApply: (template: Template) => void
}

/**
 * Live preview: the real canvas at thumbnail size, showing the user's own
 * screenshots with the template applied.
 */
function TemplateThumb({ template, onApply, ...canvas }: Omit<Props, 'onApply'> & { template: Template; onApply: () => void }) {
  const previewState = applyTemplate(canvas.state, template)
  return (
    <motion.button
      type="button"
      onClick={onApply}
      variants={staggerItem}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={SPRING}
      className="group text-center cursor-pointer"
    >
      <span className="block rounded-xl overflow-hidden border border-[#1f1f1f] group-hover:border-[#22d3ee]/60 group-hover:shadow-lg group-hover:shadow-[#22d3ee]/10 transition-[border-color,box-shadow] pointer-events-none">
        <MockupCanvas state={previewState} slots={canvas.slots.slice(0, previewState.count)} palette={canvas.palette} background={canvas.background} />
      </span>
      <span className="block mt-1.5 text-[11px] text-gray-300">{template.label}</span>
    </motion.button>
  )
}

export function TemplatesPanel(props: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'all' | 'image'>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [position, setPosition] = useState({ top: 0, left: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  useOutsideClick(containerRef, open, () => setOpen(false))

  // The gallery covers the left column, anchored to where that column sits.
  useLayoutEffect(() => {
    if (!open) return
    const column = containerRef.current?.closest('aside')
    const place = () => {
      const rect = column?.getBoundingClientRect()
      if (rect) setPosition({ top: rect.top, left: rect.left, height: rect.height })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open])

  return (
    <div ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full h-9 mb-2 px-3 rounded-xl bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a] text-xs text-white font-semibold inline-flex items-center gap-2 cursor-pointer"
      >
        <span className="w-5 h-5 rounded-md bg-gradient-to-br from-[#22d3ee] to-[#a855f7] flex items-center justify-center">
          <IconLayoutGrid size={11} />
        </span>
        Templates
        <IconChevronRight size={14} className="ml-auto text-gray-500" />
      </button>

      <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label="Templates"
          variants={flyout}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed z-50 w-[560px] rounded-2xl bg-[#111] border border-[#1f1f1f] shadow-2xl shadow-black/60 flex flex-col"
          style={{ top: position.top, left: position.left, height: position.height, transformOrigin: 'left top' }}
        >
          <div className="flex items-center justify-between p-4 pb-3">
            <h2 className="text-xl font-semibold text-white">Templates</h2>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full bg-[#1f1f1f] text-gray-300 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <IconX size={16} />
            </button>
          </div>

          <div className="flex gap-2 px-4 pb-3">
            {(
              [
                { id: 'all', label: 'All', icon: IconLayoutGrid },
                { id: 'image', label: 'Image', icon: IconPhoto },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTab(option.id)}
                className={
                  tab === option.id
                    ? 'h-9 px-4 rounded-full bg-white text-black text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer'
                    : 'h-9 px-4 rounded-full text-gray-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer'
                }
              >
                <option.icon size={15} />
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-neon px-4 pb-4 space-y-5">
            {TEMPLATE_CATEGORIES.map((category) => {
              // Every template here is a still image, so both tabs list them
              // all; the tabs exist for parity with the shots.so gallery.
              const templates = TEMPLATES.filter((t) => t.category === category.id)
              const isOpen = expanded[category.id]
              return (
                <section key={category.id}>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-base font-semibold text-white">{category.label}</h3>
                    {templates.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setExpanded((e) => ({ ...e, [category.id]: !isOpen }))}
                        className="px-3 py-1 rounded-full bg-[#1f1f1f] text-[11px] text-gray-200 hover:text-white font-semibold cursor-pointer"
                      >
                        {isOpen ? 'See less' : 'See all'}
                      </button>
                    )}
                  </div>
                  <motion.div key={String(isOpen)} className="grid grid-cols-2 gap-3" variants={stagger} initial="hidden" animate="visible">
                    {(isOpen ? templates : templates.slice(0, 2)).map((template) => (
                      <TemplateThumb
                        key={template.id}
                        template={template}
                        state={props.state}
                        slots={props.slots}
                        palette={props.palette}
                        background={props.background}
                        onApply={() => {
                          props.onApply(template)
                          setOpen(false)
                        }}
                      />
                    ))}
                  </motion.div>
                </section>
              )
            })}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
