import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from '@/lib/prompts'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File | null
    const textoDemo = formData.get('texto') as string | null

    let demandaText = ''

    if (textoDemo) {
      // Modo demo: texto directo
      demandaText = textoDemo
    } else if (file && file.size > 0) {
      // Modo real: extraer texto del PDF
      const buffer = Buffer.from(await file.arrayBuffer())
      try {
        // Importar desde lib para evitar el bug de test files de pdf-parse
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse/lib/pdf-parse')
        const data = await pdfParse(buffer)
        demandaText = data.text
      } catch (pdfError) {
        console.error('Error parsing PDF:', pdfError)
        return NextResponse.json(
          { error: 'No se pudo leer el PDF. Intenta con el modo demo o un PDF de texto seleccionable (no escaneado).' },
          { status: 400 }
        )
      }
    }

    if (!demandaText.trim()) {
      return NextResponse.json(
        { error: 'No se recibió contenido de la demanda.' },
        { status: 400 }
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'API key de Anthropic no configurada. Revisa el archivo .env.local' },
        { status: 500 }
      )
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 20000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analiza la siguiente demanda civil colombiana y genera el borrador de contestación:\n\n${demandaText.substring(0, 12000)}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Respuesta inesperada del modelo')
    }

    // Verificar que la respuesta no fue cortada por límite de tokens
    if (message.stop_reason === 'max_tokens') {
      throw new Error('La respuesta fue cortada por límite de tokens. Intenta con una demanda más corta.')
    }

    // Extraer JSON limpio de la respuesta
    const text = content.text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Respuesta sin JSON:', text.substring(0, 500))
      throw new Error('El modelo no devolvió JSON válido')
    }

    let result
    try {
      result = JSON.parse(jsonMatch[0])
    } catch {
      console.error('JSON malformado, longitud:', jsonMatch[0].length)
      throw new Error('La respuesta de la IA no pudo parsearse. Intenta de nuevo.')
    }
    result.generadoEn = new Date().toISOString()

    // Red de seguridad: aunque el prompt prohíbe que el modelo genere su propio
    // bloque de notificaciones/firma (nombre, C.C., T.P., "Del señor Juez..."),
    // a veces lo agrega de todas formas. El sistema agrega ese bloque por su
    // cuenta con los datos reales del abogado, así que aquí se elimina cualquier
    // bloque de cierre/firma que la IA haya incluido para evitar duplicados.
    if (Array.isArray(result.sections)) {
      const firmaIaRegex = /Del\s+[Ss]e[ñn]or\s+Juez,?[\s\S]{0,300}?Apoderado[^\n]*\n*/gi
      // También elimina si la IA llegó a copiar literalmente el encabezado "NOTIFICACIONES"
      // de la plantilla (esa sección la añade el sistema por su cuenta como "VIII.").
      const notificacionesHeadingRegex = /\n?\s*(VI{1,3}\.?\s*)?NOTIFICACIONES[\s\S]{0,400}?(?=\n[IVX]+\.|\n*$)/gi
      result.sections = result.sections.map((s: { contenido?: string }) => {
        if (typeof s.contenido !== 'string') return s
        let limpio = s.contenido.replace(firmaIaRegex, '')
        // Solo aplicar el filtro de NOTIFICACIONES si realmente aparece esa palabra,
        // para no recortar contenido legítimo por error de coincidencia parcial.
        if (/NOTIFICACIONES/i.test(limpio)) {
          limpio = limpio.replace(notificacionesHeadingRegex, '')
        }
        return { ...s, contenido: limpio.trim() }
      })
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error en /api/generar:', error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
