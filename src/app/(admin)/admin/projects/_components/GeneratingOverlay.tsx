'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconSparkles } from '@tabler/icons-react'

const MESSAGES = [
  'Leyendo el repositorio…',
  'Entendiendo el negocio del cliente…',
  'Traduciendo lo técnico a beneficios…',
  'Eligiendo el nombre del proyecto…',
  'Escribiendo el caso de éxito…',
  'Puliendo los últimos detalles…',
]

const MESSAGE_INTERVAL_MS = 3500

/** Cubre todo menos la sidebar (w-56) mientras la IA genera el proyecto — evita que parezca colgado */
export function GeneratingOverlay({ active }: { active: boolean }) {
  // Se remonta cada vez que `active` pasa a true (ver el `key` en ProjectForm), así que el
  // mensaje siempre arranca de nuevo en 0 sin necesitar resetear el estado desde un efecto.
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      setMessageIndex((i) => Math.min(i + 1, MESSAGES.length - 1))
    }, MESSAGE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [active])

  if (!active) return null

  return (
    <div className="fixed inset-0 left-56 z-40 flex items-center justify-center bg-black/50 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4 text-center px-6">
        <IconSparkles size={28} className="text-[#22d3ee] animate-pulse" />
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-white text-sm font-medium"
          >
            {MESSAGES[messageIndex]}
          </motion.p>
        </AnimatePresence>
        <p className="text-gray-500 text-xs">Puede tardar unos minutos — no cierres la pestaña.</p>
      </div>
    </div>
  )
}
