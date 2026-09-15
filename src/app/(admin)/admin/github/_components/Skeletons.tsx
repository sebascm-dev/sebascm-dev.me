// Loading placeholders with the final layout's dimensions, so content never jumps in.

const block = 'rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] animate-pulse motion-reduce:animate-none'

export function SyncStatusSkeleton() {
  return <div aria-hidden="true" className="h-8 w-44 animate-pulse rounded-lg bg-[#141414] motion-reduce:animate-none" />
}

export function ActivitySkeleton() {
  return (
    <div className="space-y-6">
      <span role="status" className="sr-only">Cargando actividad de GitHub…</span>
      <div aria-hidden="true" className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
        <div className={`${block} col-span-2 h-[140px] sm:col-span-4 lg:col-span-1`} />
        <div className={`${block} h-[140px]`} />
        <div className={`${block} h-[140px]`} />
        <div className={`${block} h-[140px]`} />
        <div className={`${block} h-[140px]`} />
      </div>
      <div aria-hidden="true" className={`${block} h-[260px]`} />
      <div aria-hidden="true" className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className={`${block} h-[460px]`} />
        <div className="space-y-6">
          <div className={`${block} h-[150px]`} />
          <div className={`${block} h-[170px]`} />
          <LanguagesSkeleton />
        </div>
      </div>
    </div>
  )
}

export function LanguagesSkeleton() {
  return <div aria-hidden="true" className={`${block} h-[150px]`} />
}

export function ReposSkeleton() {
  return (
    <div className="space-y-3">
      <span role="status" className="sr-only">Cargando repositorios…</span>
      <div aria-hidden="true" className="h-10 w-48 animate-pulse rounded-lg bg-[#141414] motion-reduce:animate-none" />
      <div aria-hidden="true" className={`${block} h-[240px]`} />
    </div>
  )
}
