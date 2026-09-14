// Admin dashboard — Server Component
import { requireAdmin } from '@/lib/auth'

export default async function AdminPage() {
  const user = await requireAdmin()
  // Supabase users have no top-level name; Studio keeps it in user_metadata when set
  const name = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : 'Admin'

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">
        Hola, {name} 👋
      </h1>
      <p className="text-gray-400 text-sm">
        Bienvenido al panel de administración de sebascm.dev.
      </p>
    </div>
  )
}
