// Server-only: convierte el contexto de un repo en nombre, descripción, contexto en markdown
// y un prompt de imagen de portada, con salida estructurada (sin parsear texto libre).
import { getOpenAI } from '@/lib/openai'

const MODEL = 'gpt-5-mini'

export interface ProjectBrief {
  title: string
  description: string
  content: string
  imagePrompt: string
}

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Nombre corto y claro del proyecto, en español' },
    description: { type: 'string', description: '1-2 frases para una tarjeta de portfolio, en español' },
    content: { type: 'string', description: 'Contexto del proyecto en markdown, en español' },
    imagePrompt: { type: 'string', description: 'Prompt en inglés para el modelo de imagen' },
  },
  required: ['title', 'description', 'content', 'imagePrompt'],
  additionalProperties: false,
}

const SYSTEM_PROMPT = `Actuás como un product writer senior armando la ficha de un proyecto para el portfolio de un desarrollador. Te paso una selección de archivos del repositorio (README, config, schema, páginas, estilos). A partir de eso, en español neutro, generá:

- title: nombre corto del proyecto (2-4 palabras), sin comillas.
- description: 1-2 frases que expliquen qué es y para quién, sin tecnicismos — es lo que se lee en una tarjeta, no en un README.
- content: el contexto del proyecto en markdown, con esta estructura (usá estos encabezados exactos, en este orden, y saltéalos si de verdad no hay nada que decir):
  ## El problema
  ## Qué hice
  ## Cómo funciona
  Cada sección son 2-4 frases, directas, sin relleno. No repitas el stack técnico línea por línea, eso ya se muestra aparte.
- imagePrompt: prompt EN INGLÉS para un modelo de generación de imágenes, escrito como si se lo dictaras a un diseñador gráfico senior de portadas/branding. Debe pedir un banner conceptual (nunca literal ni técnico) que transmita la esencia y la sensación del proyecto — quien lo vea debe intuir de qué trata, nunca cómo está hecho. Estilo moderno y profesional, apto portfolio, paleta basada en los colores reales que veas en el código (CSS, tailwind config, etc.) si los hay, composición limpia con un punto focal claro que funcione también en miniatura. Sin texto ni logos ni UI de pantallas dentro de la imagen.

Si el repo no da para completar algo con confianza, resolvé con tu mejor criterio en vez de inventar datos falsos — pero completá los cuatro campos siempre.`

export async function generateProjectBrief(repoContext: string, repoName: string): Promise<ProjectBrief> {
  const openai = getOpenAI()

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Repositorio: ${repoName}\n\n${repoContext}` },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'project_brief', strict: true, schema: SCHEMA },
    },
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error('OpenAI no devolvió contenido.')
  return JSON.parse(raw) as ProjectBrief
}
