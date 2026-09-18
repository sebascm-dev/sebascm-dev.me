// Server-only: cliente de OpenAI compartido. Requiere OPENAI_API_KEY (ver env.example).
import OpenAI from 'openai'

let client: OpenAI | null = null

export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
  client ??= new OpenAI({ apiKey })
  return client
}
