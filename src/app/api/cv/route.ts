import { getProfile } from '@/app/actions/profile'
import { getObject } from '@/lib/r2'
import { NextResponse } from 'next/server'

export async function GET() {
  const profile = await getProfile()

  if (!profile?.cvKey) {
    return new NextResponse('CV no disponible', { status: 404 })
  }

  try {
    const { body } = await getObject(profile.cvKey)

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Currículum - Sebastián Contreras Marín.pdf"; filename*=UTF-8\'\'Curr%C3%ADculum%20-%20Sebasti%C3%A1n%20Contreras%20Mar%C3%ADn.pdf',
      },
    })
  } catch {
    return new NextResponse('Error al obtener el CV', { status: 502 })
  }
}
