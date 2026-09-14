import { toast as sonnerToast } from 'sonner'

function playNotification() {
  const audio = new Audio('/sounds/notificacion.mp3')
  audio.volume = 0.4
  // play() devuelve una Promise en navegadores modernos, pero undefined en
  // entornos sin soporte de media (jsdom, navegadores antiguos): encadenamos solo si existe
  audio.play()?.catch(() => {
    // El navegador puede bloquear el audio si no hubo interacción previa — ignoramos silenciosamente
  })
}

export const toast = {
  success: (message: string, options?: Parameters<typeof sonnerToast.success>[1]) => {
    playNotification()
    return sonnerToast.success(message, options)
  },
  error: (message: string, options?: Parameters<typeof sonnerToast.error>[1]) => {
    playNotification()
    return sonnerToast.error(message, options)
  },
  warning: (message: string, options?: Parameters<typeof sonnerToast.warning>[1]) => {
    playNotification()
    return sonnerToast.warning(message, options)
  },
  info: (message: string, options?: Parameters<typeof sonnerToast.info>[1]) => {
    playNotification()
    return sonnerToast.info(message, options)
  },
  promise: sonnerToast.promise,
}
