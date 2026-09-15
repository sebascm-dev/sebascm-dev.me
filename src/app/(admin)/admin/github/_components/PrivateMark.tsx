import { IconLock } from '@tabler/icons-react'

/** Lock icon with an accessible label: marks private repositories without relying on color */
export function PrivateMark({ size = 12 }: { size?: number }) {
  return (
    <IconLock
      size={size}
      role="img"
      aria-label="Repositorio privado"
      className="shrink-0 text-gray-400"
    />
  )
}
