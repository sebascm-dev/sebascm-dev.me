// Next.js 16 proxy (formerly middleware.ts)
// Named export `proxy` is required (not `middleware`, not default export)
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import { isAdminEmail } from '@/lib/auth-policy'

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)

  if (isAdminEmail(user?.email, process.env.ADMIN_EMAIL)) return response

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.search = ''

  const redirectResponse = NextResponse.redirect(loginUrl)
  // Keep cookies written while refreshing or clearing the session, otherwise
  // the browser would hold on to stale tokens
  for (const cookie of response.cookies.getAll()) {
    redirectResponse.cookies.set(cookie)
  }
  redirectResponse.headers.set('Cache-Control', 'private, no-store')

  return redirectResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}
