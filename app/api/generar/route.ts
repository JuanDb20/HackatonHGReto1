import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from '@/lib/prompts'
import { getSession } from '@/lib/auth'
import sql from '@/lib/db'
import { parseFechaISO, sumarDiasHabilesColombia, formatFechaISO } from '@/lib/diasHabilesCo'

// Render permite respuestas HTTP de hasta 100 minutos (a diferencia del
// límite duro de 60s de Vercel Hobby), así que no hace falta dividir la
// generación en varias llamadas: una sola llamada completa con el mejor
// modelo es suficiente.
export const maxDuration = 300

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
      model: 'claude-opus-4-8',
      max_tokens: 20000,
      // Prompt caching: el SYSTEM_PROMPT es grande (~24k caracteres) y se repite
      // idéntico en cada llamada. Cachearlo evita que Claude tenga que reprocesarlo
      // de cero cada vez, lo que reduce notablemente la latencia y el costo en
      // llamadas repetidas (cache válido ~5 min).
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
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

    // Persistir el caso para seguimiento de términos. Si no hay sesión activa
    // (no debería pasar en uso normal, pero por seguridad) o la tabla aún no
    // existe (falta correr /api/casos/setup una vez), no se rompe la
    // generación — el borrador se devuelve igual, simplemente sin casoId.
    let casoId: number | null = null
    let fechaVencimientoSugerida: string | null = null
    try {
      const session = await getSession()
      if (session) {
        const meta = result.metadata || {}
        const fechaNotif = parseFechaISO(meta.fechaNotificacion)
        const terminoDias = Number.isFinite(Number(meta.terminoDias)) ? Number(meta.terminoDias) : null
        if (fechaNotif && terminoDias && terminoDias > 0) {
          fechaVencimientoSugerida = formatFechaISO(sumarDiasHabilesColombia(fechaNotif, terminoDias))
        }

        const rows = await sql`
          INSERT INTO litigia_casos (
            user_id, demandante, demandado, radicado, juzgado, tipo_proceso,
            fecha_notificacion, termino_dias, fecha_vencimiento, contestacion_json
          )
          VALUES (
            ${session.id}, ${meta.demandante || null}, ${meta.demandado || null},
            ${meta.radicado || null}, ${meta.juzgado || null}, ${meta.tipoProceso || null},
            ${fechaNotif ? formatFechaISO(fechaNotif) : null}, ${terminoDias},
            ${fechaVencimientoSugerida}, ${JSON.stringify(result)}
          )
          RETURNING id
        `
        casoId = rows[0]?.id ?? null
      }
    } catch (dbError) {
      console.error('No se pudo guardar el caso para seguimiento (¿falta correr /api/casos/setup?):', dbError)
    }

    result.casoId = casoId
    result.fechaVencimientoSugerida = fechaVencimientoSugerida

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error en /api/generar:', error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
