// Sirve archivos de R2 desde el propio dominio, leyéndolos por la API de almacenamiento
// (no por el dominio público de Cloudflare) — evita las IPs anycast bloqueadas en España.
import { NextResponse } from 'next/server'
import { getObject } from '@/lib/r2'

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const key = path.join('/')

  try {
    const { body, contentType, contentLength } = await getObject(key)

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        ...(contentLength != null ? { 'Content-Length': String(contentLength) } : {}),
        // Las keys llevan timestamp en el nombre — el contenido de una key dada nunca cambia
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    console.error('[GET /api/images] error', key, err)
    return new NextResponse('No encontrado', { status: 404 })
  }
}
