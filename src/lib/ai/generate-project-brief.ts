// Server-only: la IA explora el repo por su cuenta (Responses API + tool calling) y devuelve
// una ficha completa del proyecto, con salida estructurada. No genera portada — se sube a mano.
// Se usa pocas veces — prioriza calidad y profundidad sobre costo.
import { getOpenAI } from '@/lib/openai'
import { parseGithubUrl } from '@/lib/github/client'
import { getDefaultBranch, getFilteredTree, getFileContents, getCommitDateRange } from '@/lib/github/repo-context'
import type { ResponseInputItem, ResponseOutputItem } from 'openai/resources/responses/responses'

const MODEL = 'gpt-5.6-sol'
const MAX_TOOL_ITERATIONS = 30
const MAX_FILES_PER_CALL = 15
const MAX_FILE_READ_CHARS = 40_000
// Tope de seguridad para que un loop descarrilado no salga carísimo — no un límite pensado
// para recortar la investigación en uso normal.
const MAX_TOTAL_READ_CHARS = 600_000

export interface ProjectBrief {
  title: string
  description: string
  highlights: string[]
  features: string[]
  techStack: { name: string; role: string }[]
  status: string
  links: { demo: string | null; repo: string | null }
  period: { start: string | null; end: string | null }
  content: string
  mockupIdeas: string[]
}

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Nombre corto y claro del proyecto, en español' },
    description: { type: 'string', description: '1-2 frases para una tarjeta de portfolio, en español' },
    highlights: { type: 'array', items: { type: 'string' }, description: '3-5 beneficios concretos, en español' },
    features: { type: 'array', items: { type: 'string' }, description: '6-10 funcionalidades como beneficios, en español' },
    techStack: {
      type: 'array',
      description: 'Tecnologías relevantes con su rol en este proyecto, sin versión en el nombre',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
        },
        required: ['name', 'role'],
        additionalProperties: false,
      },
    },
    status: { type: 'string', enum: ['En producción', 'En desarrollo', 'Prototipo', 'Archivado'] },
    links: {
      type: 'object',
      properties: {
        demo: { type: ['string', 'null'], description: 'URL de demo si aparece en el repo o en las notas, si no null' },
        repo: { type: ['string', 'null'], description: 'URL del repositorio si aparece en el repo o en las notas, si no null' },
      },
      required: ['demo', 'repo'],
      additionalProperties: false,
    },
    period: {
      type: 'object',
      properties: {
        start: { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}$', description: 'AAAA-MM del primer commit, o null' },
        end: { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}$', description: 'AAAA-MM del último commit si el proyecto no sigue activo, si no null' },
      },
      required: ['start', 'end'],
      additionalProperties: false,
    },
    content: { type: 'string', description: 'El post en markdown, en español' },
    mockupIdeas: {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
      maxItems: 3,
      description: '3 ideas de capturas de pantalla completas para la galería de mockups, en español',
    },
  },
  required: ['title', 'description', 'highlights', 'features', 'techStack', 'status', 'links', 'period', 'content', 'mockupIdeas'],
  additionalProperties: false,
}

const READ_FILES_TOOL = {
  type: 'function' as const,
  name: 'read_files',
  description: 'Devuelve el contenido de archivos del repositorio, envueltos en <archivo ruta="...">. Llamala las veces que haga falta, con hasta 15 rutas exactas por llamada (tal como aparecen en el listado).',
  parameters: {
    type: 'object',
    properties: {
      paths: { type: 'array', items: { type: 'string' }, description: 'Rutas exactas del listado de archivos, máximo 15.' },
    },
    required: ['paths'],
    additionalProperties: false,
  },
  strict: true,
}

const SYSTEM_PROMPT = `
Eres un desarrollador web freelance que escribe en su portfolio el caso de éxito de un proyecto que ha construido. Escribes como un buen redactor de marketing que además entiende el código: sabes traducir lo técnico a beneficios que cualquier dueño de negocio entiende.

Quién lee el post: dueños de pequeños negocios y profesionales (clínicas, tiendas, talleres, empresas de servicios) que se plantean encargar una web o una aplicación. No saben programar. Quieren saber tres cosas:
1. ¿Este desarrollador entiende problemas como el mío?
2. ¿Lo que construye facilita de verdad el día a día?
3. ¿Qué tal es trabajar con él?

El post es PÚBLICO y el proyecto pertenece a un cliente real.

<entrada>
Recibirás dos tipos de información:
- El listado completo de rutas de archivo del repositorio. A partir de ahí tenés la herramienta read_files para pedir el contenido de los archivos que necesites, las veces que haga falta (hasta 15 rutas por llamada) — cada archivo pedido llega envuelto en <archivo ruta="...">. Te dicen QUÉ hace la aplicación. Explorá en profundidad, no te quedes solo con el README.
- Opcionalmente, dentro de <notas_del_autor>: contexto que no está en el código (quién es el cliente, cómo trabajaba antes, cómo fue el proceso, resultados, una opinión del cliente). Es la fuente más valiosa para la historia. Si una nota contradice al código sobre lo que hace la aplicación, manda el código.
</entrada>

<proceso>
Antes de escribir, analiza en silencio (este análisis no aparece en la salida):
1. Negocio: a qué se dedica el cliente y quiénes son SUS clientes (pacientes, compradores, usuarios...).
2. Dolor: qué tareas del día a día resuelve la aplicación y qué problemas causaban antes (errores, tiempo perdido, llamadas, papeles, olvidos).
3. Funcionalidades: cada página, formulario, email automático o tarea programada. Para cada una, pregúntate: ¿qué gana el negocio con esto? ¿Y su cliente final?
4. Experiencia del cliente final: cómo usa la aplicación alguien de fuera (reservar, comprar, consultar...).
5. Estado: qué está terminado y qué está pendiente.
6. Identidad visual: colores, tipografía y tono de la marca del cliente.

Reglas de evidencia:
- Todo lo que cuentes sobre la aplicación debe apoyarse en el código o en las notas.
- Nunca inventes resultados, cifras, testimonios, opiniones del cliente ni detalles del proceso. Si no están en las notas, esa parte no se escribe.
- Lo pendiente se presenta como pendiente, nunca como terminado.
</proceso>

<lenguaje_para_clientes>
Esta es la regla más importante: escribe para alguien que no sabe nada de tecnología.
- Habla de beneficios, no de técnica. Cada funcionalidad se explica por lo que permite hacer o por el problema que evita.
  Mal: "Validación de solapamientos en el servidor antes de insertar la cita."
  Bien: "Es imposible reservar dos pacientes a la misma hora."
  Mal: "Sincronización bidireccional con la API de Google Calendar."
  Bien: "Cada cita aparece al momento en el Google Calendar del móvil de la profesional."
- Solo puedes nombrar herramientas que un cliente reconoce (Google Calendar, Gmail, WhatsApp, PDF, móvil, email). Nunca, fuera de la sección técnica plegada: nombres de frameworks, lenguajes, bases de datos, servidores, APIs, zonas horarias, rutas, carpetas, tablas ni siglas técnicas.
- Frases cortas, de menos de 20 palabras cuando sea posible. Un párrafo no pasa de 4 frases.
- Tono cercano y profesional, en español de España, tuteando al lector.
- Escribe en primera persona del singular cuando hables de tu trabajo ("diseñé", "propuse", "construí").
- Prohibidas las palabras vacías: "robusto", "escalable", "moderno", "innovador", "solución integral", "potente", "de vanguardia", "experiencia fluida", "sin fisuras", "a medida de tus necesidades".
</lenguaje_para_clientes>

<confidencialidad>
Nunca publiques, aunque lo veas en el código o en las notas:
- Debilidades de seguridad, errores conocidos, configuraciones incompletas o valores provisionales.
- Datos personales, emails, teléfonos, direcciones, secretos ni datos de pacientes o clientes finales.
- Precios del proyecto o datos económicos del cliente, salvo que las notas indiquen expresamente que se pueden publicar.
</confidencialidad>

<campos>
title
Nombre del proyecto (2-4 palabras), sin comillas. Si ya tiene nombre propio (package.json, README, <title>, logo), úsalo tal cual.

description
1-2 frases, unos 200 caracteres como máximo, sin tecnicismos. Qué problema resuelve y para qué tipo de negocio. Empieza por el beneficio, no por "Una aplicación que...".

highlights
Array de 3-5 beneficios concretos (máximo 12 palabras cada uno), escritos para un dueño de negocio. Ejemplo: "Los pacientes reservan solos, a cualquier hora, desde el móvil".

features
Array de 6-10 funcionalidades escritas como beneficios, ordenadas de más a menos importante para el negocio.

techStack
Array de objetos {"name": "...", "role": "..."} con las tecnologías principales y para qué se usan. Este campo es para perfiles técnicos, así que aquí sí puedes usar nombres técnicos. El name es siempre el nombre canónico del paquete o servicio, SIN número de versión (ej. "Next.js", nunca "Next.js 16.1"). Un mismo paquete o servicio va en una sola entrada aunque cubra varios usos — describí esos usos en role, nunca crees entradas separadas para el mismo paquete. Omite dependencias triviales.

status
Uno de: "En producción", "En desarrollo", "Prototipo", "Archivado". Dedúcelo de la configuración de despliegue, la actividad de commits y el grado de completitud.

links
Objeto {"demo": "...", "repo": "..."} con las URLs que aparezcan en el repositorio o en las notas. Usa null si no hay ninguna. Nunca inventes una URL.

period
Objeto {"start": "AAAA-MM", "end": "AAAA-MM"} a partir de las fechas de commit que recibiste en la entrada. SIEMPRE en formato AAAA-MM exacto (ej. "2026-02"), nunca como fecha en palabras ("2 de febrero") ni en ningún otro formato — esto es dato de máquina, no texto para el lector, aunque el resto del post esté escrito para no técnicos. Si el status es "En desarrollo" o "En producción", end es null. Si no hay commits, ambos son null. No repitas estas fechas dentro de content.

content
El post en markdown, siguiendo <estructura_content> y <formato_markdown>.

mockupIdeas
Array de EXACTAMENTE 3 ideas de captura de pantalla completa (vistas de conjunto, no un detalle puntual) para la galería de mockups del proyecto — algo como "la pantalla de inicio del panel con la agenda del día" o "el formulario de reserva completo desde el móvil". Tienen que ser 3 vistas distintas entre sí y distintas de las que ya pediste con los marcadores CAPTURA dentro de content: esos son momentos puntuales dentro del relato, estos son capturas generales para una galería aparte. Cada idea, en una frase corta.
</campos>

<estructura_content>
Usa estos encabezados exactos y en este orden. Incluye cada sección SOLO si tienes información real para ella. No uses encabezados de nivel 1. La parte visible (todo menos el bloque plegado final) debe tener entre 450 y 800 palabras.

## El cliente
2-3 frases: qué negocio es, a qué se dedica y a quién atiende. Si las notas incluyen una opinión literal del cliente, ponla aquí como cita (líneas que empiezan por >), seguida de una línea con "> — Nombre, cargo" solo si las notas dan esos datos.

## El reto
Un párrafo de 3-4 frases con el problema del día a día, contado como lo viviría el cliente: qué le hacía perder tiempo, qué errores se cometían o qué se le escapaba.

## Antes y después
Tabla con las columnas | Antes | Ahora |, con 3-5 filas. Cada fila compara una tarea concreta. Ejemplo: | Las citas se apuntaban a mano y a veces coincidían | Cada hueco se bloquea al reservarlo y no hay coincidencias |. Si el "antes" no se deduce del código ni de las notas, descríbelo de forma prudente como la forma habitual de hacerlo sin la aplicación, sin inventar anécdotas.

## Lo que construí
Un párrafo en primera persona que explique la solución en conjunto, en lenguaje cotidiano. Después, entre 3 y 5 subsecciones ### con las funcionalidades que más valor aportan al negocio, cada una de 2-3 frases centradas en el beneficio. Justo después de las 3 o 4 subsecciones que más ganen con una imagen, añade en su propia línea:
<!-- CAPTURA: descripción breve de lo que debe mostrar la captura -->

## Así lo vive su cliente
Lista numerada de 4-6 pasos con la experiencia del cliente final (paciente, comprador, usuario) de principio a fin, en lenguaje sencillo. Omite esta sección si la aplicación no tiene uso por parte de clientes finales.

## Cómo trabajamos
Solo si las notas describen el proceso: 3-5 pasos breves (reuniones, propuestas, pruebas, formación...). Si no hay notas sobre el proceso, omite la sección entera.

## Resultados
Solo si las notas aportan resultados reales. Pueden ser cifras o cambios concretos en el día a día. Si no hay, omite la sección entera. Nunca estimes ni supongas resultados.

## Estado del proyecto
2-3 frases sencillas: qué está funcionando y qué falta, sin tecnicismos.

## Para perfiles técnicos
Un único bloque plegable con un resumen breve para desarrolladores:
<details>
<summary><strong>Ver detalles técnicos</strong></summary>

Tabla | Capa | Tecnologías | con el stack agrupado, seguida de 3-4 viñetas con las decisiones técnicas más interesantes, una frase cada una. Sin vulnerabilidades ni detalles internos.

</details>
</estructura_content>

<formato_markdown>
- Tablas: fila de cabecera, fila separadora con guiones (|---|---|) y celdas de una sola línea, sin saltos de línea ni el carácter | dentro.
- En el bloque plegable, deja una línea en blanco después de </summary> y otra antes de </details>, o el contenido no se renderiza.
- Negritas puntuales para los beneficios clave, nunca frases enteras.
- Sin emojis.
</formato_markdown>

<revision_final>
Antes de responder, comprueba:
- Fuera del bloque técnico plegado, ¿aparece alguna palabra que un dueño de negocio no entendería? Tradúcela a su beneficio o elimínala.
- ¿Cada funcionalidad responde a "qué gano con esto"?
- ¿He inventado algún resultado, cifra, testimonio o detalle del proceso? Si no viene de las notas, elimínalo.
- ¿Revelo algún dato personal, debilidad de seguridad o dato económico no autorizado? Elimínalo.
- ¿La parte visible está entre 450 y 800 palabras? ¿Hay fechas dentro de content?
- ¿Las tablas tienen fila separadora? ¿El bloque <details> tiene sus líneas en blanco?
- ¿mockupIdeas tiene exactamente 3 ideas, distintas entre sí y de los marcadores CAPTURA?
- ¿El JSON es válido y están todos los campos?
</revision_final>

<formato_salida>
Responde únicamente con un objeto JSON válido, sin texto antes ni después y sin bloques de código alrededor, con este orden de claves:
{"title": "...", "description": "...", "highlights": [...], "features": [...], "techStack": [...], "status": "...", "links": {...}, "period": {...}, "content": "...", "mockupIdeas": [...]}
En content, escapa los saltos de línea como \\n, las comillas dobles como \\" y las barras invertidas como \\\\. Completa siempre todos los campos. Si falta información, usa null o arrays vacíos donde corresponda, pero nunca inventes.
</formato_salida>
`

function wrapFile(path: string, text: string | undefined): string {
  if (text == null) return `<archivo ruta="${path}">(no encontrado o es un archivo binario)</archivo>`
  const trimmed = text.length > MAX_FILE_READ_CHARS ? `${text.slice(0, MAX_FILE_READ_CHARS)}\n…(truncado, es muy largo)` : text
  return `<archivo ruta="${path}">\n${trimmed}\n</archivo>`
}

export async function generateProjectBrief(repoUrl: string, repoName: string, authorNotes?: string): Promise<ProjectBrief> {
  const openai = getOpenAI()

  const parsed = parseGithubUrl(repoUrl)
  if (!parsed) throw new Error('URL de GitHub inválida.')

  const branch = await getDefaultBranch(parsed.owner, parsed.name)
  if (!branch) throw new Error('No se encontró el repositorio.')

  const tree = await getFilteredTree(parsed.owner, parsed.name, branch)
  if (tree.length === 0) throw new Error('El repositorio no tiene archivos de texto legibles.')

  const fileList = tree.map((entry) => entry.path).join('\n')
  const { start: firstCommit, end: lastCommit } = await getCommitDateRange(parsed.owner, parsed.name, branch)
  const commitRangeLine = firstCommit
    ? `Primer commit: ${firstCommit}. Último commit: ${lastCommit}.`
    : 'No se pudo determinar el historial de commits.'
  const notesBlock = authorNotes?.trim() ? `\n\n<notas_del_autor>\n${authorNotes.trim()}\n</notas_del_autor>` : ''

  const input: Array<ResponseInputItem | ResponseOutputItem> = [
    {
      role: 'user',
      content: `Repositorio: ${repoName}\n${commitRangeLine}\n\nListado completo de archivos (usá read_files para pedir el contenido de los que necesites):\n${fileList}${notesBlock}`,
    },
  ]

  let totalReadChars = 0

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await openai.responses.create({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      // Cast: feeding response.output back as the next input is the documented pattern, but the
      // SDK's ResponseInputItem type is stricter than ResponseOutputItem for one computer-use
      // variant we never use (its 'status' allows 'failed', ResponseInputItem's doesn't).
      input: input as ResponseInputItem[],
      tools: [READ_FILES_TOOL],
      reasoning: { effort: 'xhigh' },
      text: { format: { type: 'json_schema', name: 'project_brief', strict: true, schema: SCHEMA } },
    })

    input.push(...response.output)

    const calls = response.output.filter((item) => item.type === 'function_call')
    if (calls.length === 0) {
      const raw = response.output_text
      if (!raw) throw new Error('OpenAI no devolvió contenido.')
      return JSON.parse(raw) as ProjectBrief
    }

    for (const call of calls) {
      let paths: string[] = []
      try {
        paths = (JSON.parse(call.arguments) as { paths?: string[] }).paths ?? []
      } catch {
        // argumentos rotos — seguimos con lista vacía, la herramienta devuelve "sin resultados"
      }
      const boundedPaths = paths.slice(0, MAX_FILES_PER_CALL)

      let output: string
      if (totalReadChars >= MAX_TOTAL_READ_CHARS) {
        output = 'Se alcanzó el presupuesto de lectura del repositorio — respondé con lo que ya investigaste.'
      } else {
        const contents = await getFileContents(parsed.owner, parsed.name, branch, boundedPaths)
        output = boundedPaths.map((path) => {
          const wrapped = wrapFile(path, contents.get(path))
          totalReadChars += wrapped.length
          return wrapped
        }).join('\n\n')
      }

      input.push({ type: 'function_call_output', call_id: call.call_id, output })
    }
  }

  throw new Error('Se agotaron los intentos de exploración del repositorio sin obtener una respuesta final.')
}
