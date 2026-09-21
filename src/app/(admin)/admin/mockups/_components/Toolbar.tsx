'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE, SPRING, SPRING_SOFT, popover, stagger, staggerItem } from './motion'
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconCommand,
  IconMaximize,
  IconMinimize,
  IconPlus,
} from '@tabler/icons-react'
import { useOutsideClick } from './ui'

/** Every keyboard shortcut the editor answers to, as shown in the ⌘ panel. */
export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Ctrl', 'V'], label: 'Pegar captura' },
  { keys: ['Ctrl', 'Z'], label: 'Deshacer' },
  { keys: ['Ctrl', 'Shift', 'Z'], label: 'Rehacer' },
  { keys: ['Ctrl', 'E'], label: 'Exportar' },
  { keys: ['Ctrl', 'Shift', 'C'], label: 'Copiar imagen' },
  { keys: ['F'], label: 'Pantalla completa' },
  { keys: ['Shift'], label: 'Arrastre de precisión' },
  { keys: ['Doble clic'], label: 'Centrar / enderezar' },
]

function ToolbarButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.88 }}
      transition={SPRING}
      className={
        active
          ? 'w-8 h-8 rounded-lg inline-flex items-center justify-center text-[#22d3ee] bg-[#1a1a1a] cursor-pointer'
          : 'w-8 h-8 rounded-lg inline-flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400'
      }
    >
      {children}
    </motion.button>
  )
}

export function StartOverDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      onPointerDown={onCancel}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={EASE}
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="start-over-title"
        aria-describedby="start-over-text"
        onPointerDown={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: SPRING_SOFT }}
        exit={{ opacity: 0, scale: 0.95, y: 6, transition: EASE }}
        className="w-[340px] rounded-3xl bg-[#141414] border border-[#1f1f1f] shadow-2xl shadow-black/60 p-6 text-center"
      >
        {/* The illustration floats in a beat after the card, for a bit of life */}
        <motion.div
          initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1, transition: { ...SPRING, delay: 0.06 } }}
          className="mx-auto w-28 h-20 rounded-xl bg-gradient-to-br from-[#22d3ee] to-[#a855f7] flex items-center justify-center"
        >
          <span className="w-14 h-12 rounded-md bg-[#111] flex items-center justify-center">
            <span className="w-4 h-4 rounded-full bg-white text-black flex items-center justify-center">
              <IconPlus size={10} stroke={3} />
            </span>
          </span>
        </motion.div>
        <h2 id="start-over-title" className="mt-5 text-xl font-semibold text-white">
          ¿Empezar de cero?
        </h2>
        <p id="start-over-text" className="mt-1.5 text-xs text-gray-400">
          Se perderán las capturas y todos los ajustes actuales.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="h-11 rounded-full bg-[#1f1f1f] text-white text-sm font-semibold hover:bg-[#262626] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 rounded-full bg-white text-black text-sm font-semibold hover:bg-gray-100 cursor-pointer"
          >
            Empezar de cero
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function Toolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onStartOver,
  fullscreen,
  onToggleFullscreen,
}: {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onStartOver: () => void
  fullscreen: boolean
  onToggleFullscreen: () => void
}) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const shortcutsRef = useRef<HTMLDivElement>(null)
  useOutsideClick(shortcutsRef, shortcutsOpen, () => setShortcutsOpen(false))

  return (
    <div className="flex items-center justify-center gap-1">
      <ToolbarButton label="Deshacer (Ctrl+Z)" onClick={onUndo} disabled={!canUndo}>
        <IconArrowBackUp size={17} />
      </ToolbarButton>
      <ToolbarButton label="Rehacer (Ctrl+Shift+Z)" onClick={onRedo} disabled={!canRedo}>
        <IconArrowForwardUp size={17} />
      </ToolbarButton>

      <div ref={shortcutsRef} className="relative">
        <ToolbarButton label="Atajos de teclado" onClick={() => setShortcutsOpen((o) => !o)} active={shortcutsOpen}>
          <IconCommand size={16} />
        </ToolbarButton>
        <AnimatePresence>
        {shortcutsOpen && (
          // Centred with a wrapper so the popover's own transform stays free
          // for the animation (a translate class would be overwritten).
          <div className="absolute left-1/2 top-full mt-2 z-50 -translate-x-1/2">
          <motion.div
            variants={popover}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ transformOrigin: 'top center' }}
            className="w-64 rounded-2xl bg-[#0d0d0d] border border-[#1f1f1f] shadow-2xl shadow-black/60 p-3"
          >
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest font-[var(--font-fira-code)] mb-2">
              Atajos
            </p>
            <motion.ul className="space-y-1.5" variants={stagger} initial="hidden" animate="visible">
              {SHORTCUTS.map((shortcut) => (
                <motion.li key={shortcut.label} variants={staggerItem} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-gray-300">{shortcut.label}</span>
                  <span className="flex gap-1">
                    {shortcut.keys.map((key) => (
                      <kbd
                        key={key}
                        className="px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[10px] text-gray-300 font-[var(--font-fira-code)]"
                      >
                        {key}
                      </kbd>
                    ))}
                  </span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
          </div>
        )}
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        onClick={onStartOver}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        transition={SPRING}
        className="mx-1 h-8 px-4 rounded-full bg-[#1a1a1a] text-white text-xs font-semibold hover:bg-[#222] transition-colors cursor-pointer"
      >
        Start Over
      </motion.button>

      <ToolbarButton label={fullscreen ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)'} onClick={onToggleFullscreen}>
        {fullscreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
      </ToolbarButton>
    </div>
  )
}
