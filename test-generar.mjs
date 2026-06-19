import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT, DEMANDA_EJEMPLO } from '/sessions/elegant-laughing-lamport/mnt/HackatonHGReto1/lib/prompts.ts'
import fs from 'fs'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const message = await client.messages.create({
  model: 'claude-opus-4-5',
  max_tokens: 20000,
  system: SYSTEM_PROMPT,
  messages: [
    {
      role: 'user',
      content: `Analiza la siguiente demanda civil colombiana y genera el borrador de contestación:\n\n${DEMANDA_EJEMPLO.substring(0, 12000)}`,
    },
  ],
})

const content = message.content[0]
if (content.type !== 'text') throw new Error('Respuesta inesperada del modelo')
if (message.stop_reason === 'max_tokens') {
  console.error('TRUNCADO por max_tokens')
}

const text = content.text.trim()
fs.writeFileSync('/sessions/elegant-laughing-lamport/mnt/outputs/raw-response.txt', text)

const jsonMatch = text.match(/\{[\s\S]*\}/)
if (!jsonMatch) {
  console.error('Sin JSON. Primeros 500 chars:', text.substring(0, 500))
  process.exit(1)
}

let result
try {
  result = JSON.parse(jsonMatch[0])
} catch (e) {
  console.error('JSON malformado:', e.message, 'longitud:', jsonMatch[0].length)
  process.exit(1)
}

console.log('=== VALIDACION ===')
console.log('stop_reason:', message.stop_reason)
console.log('metadata:', JSON.stringify(result.metadata, null, 2))
console.log('estrategia:', JSON.stringify(result.estrategia, null, 2))
console.log('alertasCriticas:', JSON.stringify(result.alertasCriticas, null, 2))
console.log('numero de secciones:', result.sections?.length)
console.log('ids de secciones en orden:', result.sections?.map(s => s.id))
for (const s of result.sections || []) {
  console.log(`--- [${s.id}] ${s.titulo} (requiereRevision=${s.requiereRevision}) ---`)
  console.log(s.contenido.substring(0, 300))
  console.log('... [longitud total:', s.contenido.length, 'chars]')
  if (/NOTIFICACIONES/i.test(s.contenido)) {
    console.log('!!! ALERTA: contiene la palabra NOTIFICACIONES (posible duplicado del bloque del sistema)')
  }
}

fs.writeFileSync('/sessions/elegant-laughing-lamport/mnt/outputs/parsed-result.json', JSON.stringify(result, null, 2))
console.log('\nGuardado en outputs/parsed-result.json y outputs/raw-response.txt')
