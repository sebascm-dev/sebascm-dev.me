// Server-only: genera el banner de portada a partir de un prompt ya armado por generateProjectBrief.
import { getOpenAI } from '@/lib/openai'

const MODEL = 'gpt-image-2'
// Landscape más cercano a 2:1 que ofrece la API (no hay un preset exacto de 1280x640)
const SIZE = '1536x1024'

export async function generateCoverImage(prompt: string): Promise<Buffer> {
  const openai = getOpenAI()

  const result = await openai.images.generate({
    model: MODEL,
    prompt,
    size: SIZE,
  })

  const b64 = result.data?.[0]?.b64_json
  if (!b64) throw new Error('OpenAI no devolvió una imagen.')
  return Buffer.from(b64, 'base64')
}
