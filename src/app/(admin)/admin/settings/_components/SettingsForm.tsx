'use client'

import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from '@/lib/toast'
import { IconDeviceFloppy, IconChartLine } from '@tabler/icons-react'
import { updateSettings, type SettingsActionResult } from '@/app/actions/settings'
import type { settings } from '@/lib/schema'
import type { InferSelectModel } from 'drizzle-orm'

type Settings = InferSelectModel<typeof settings>

const initialState: SettingsActionResult = { success: false }

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#22d3ee] text-black text-sm font-semibold rounded-lg hover:bg-[#06b6d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <IconDeviceFloppy size={16} />
      {pending ? 'Guardando...' : 'Guardar ajustes'}
    </button>
  )
}

export function SettingsForm({ initialData }: { initialData: Settings | null }) {
  const [state, formAction] = useActionState(updateSettings, initialState)

  useEffect(() => {
    if (state.success) toast.success('Ajustes guardados correctamente.')
    else if (state.error) toast.error(state.error)
  }, [state])

  return (
    <form action={formAction} className="space-y-6">
      <section className="border border-[#1a1a1a] rounded-lg p-4 flex items-start gap-4">
        <div className="mt-0.5 shrink-0 w-9 h-9 rounded-lg bg-[#111] border border-[#1a1a1a] flex items-center justify-center text-gray-500">
          <IconChartLine size={16} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium">Tooltip del gráfico de actividad</p>
          <p className="mt-1 text-xs text-gray-500 leading-relaxed">
            Ficha que aparece al pasar el cursor por el gráfico de commits del Hero. Si notás que va lento
            en algún dispositivo, desactivala: el gráfico se sigue viendo igual, pero deja de reaccionar al
            movimiento del ratón.
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer h-[38px] w-16 shrink-0">
          <input
            type="checkbox"
            name="activityTooltipEnabled"
            value="true"
            defaultChecked={initialData?.activityTooltipEnabled ?? true}
            className="sr-only peer"
          />
          <div className="w-16 h-[38px] bg-[#111] border border-[#1a1a1a] rounded-lg peer-checked:bg-[#22d3ee] peer-checked:border-[#22d3ee] transition-colors duration-200" />
          <div className="absolute left-[5px] top-1/2 -translate-y-1/2 w-[14px] h-[26px] bg-white/30 rounded-md shadow transition-all duration-200 peer-checked:translate-x-[40px] peer-checked:bg-white" />
        </label>
      </section>

      <SaveButton />
    </form>
  )
}
