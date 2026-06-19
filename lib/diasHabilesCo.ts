// ============================================================
// CALCULADORA DE DÍAS HÁBILES — CALENDARIO JUDICIAL COLOMBIANO
// Excluye sábados, domingos y los 18 festivos nacionales,
// incluyendo los festivos móviles (Ley Emiliani, Ley 51 de 1983)
// y los basados en la fecha de Pascua.
//
// Todas las fechas se manejan en UTC (sin componente de hora) para
// evitar bugs de zona horaria al sumar/restar días.
// ============================================================

/** Construye una fecha UTC a medianoche a partir de año/mes(1-12)/día. */
function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day))
}

function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

/** Domingo de Pascua para un año dado (algoritmo de Meeus/Jones/Butcher). */
function domingoDePascua(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 3 = marzo, 4 = abril
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return utcDate(year, month, day)
}

/** Mueve una fecha al lunes siguiente si no cae en lunes (Ley Emiliani). */
function trasladarALunes(date: Date): Date {
  const dow = date.getUTCDay() // 0 = domingo ... 6 = sábado
  const diff = (1 - dow + 7) % 7
  return addDaysUTC(date, diff)
}

const cacheFestivos = new Map<number, Set<string>>()

function claveFecha(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Calcula los 18 festivos nacionales de Colombia para un año dado. */
export function festivosColombia(year: number): Date[] {
  const pascua = domingoDePascua(year)

  const fijos = [
    utcDate(year, 1, 1),   // Año Nuevo
    utcDate(year, 5, 1),   // Día del Trabajo
    utcDate(year, 7, 20),  // Independencia
    utcDate(year, 8, 7),   // Batalla de Boyacá
    utcDate(year, 12, 8),  // Inmaculada Concepción
    utcDate(year, 12, 25), // Navidad
  ]

  // Atados a la Pascua, no se trasladan
  const semanaSanta = [
    addDaysUTC(pascua, -3), // Jueves Santo
    addDaysUTC(pascua, -2), // Viernes Santo
  ]

  // Ley Emiliani: se trasladan al lunes siguiente si no caen en lunes
  const trasladables = [
    utcDate(year, 1, 6),          // Reyes Magos
    utcDate(year, 3, 19),         // San José
    addDaysUTC(pascua, 39),       // Ascensión del Señor
    addDaysUTC(pascua, 60),       // Corpus Christi
    addDaysUTC(pascua, 68),       // Sagrado Corazón
    utcDate(year, 6, 29),         // San Pedro y San Pablo
    utcDate(year, 8, 15),         // Asunción de la Virgen
    utcDate(year, 10, 12),        // Día de la Raza
    utcDate(year, 11, 1),         // Todos los Santos
    utcDate(year, 11, 11),        // Independencia de Cartagena
  ].map(trasladarALunes)

  return [...fijos, ...semanaSanta, ...trasladables]
}

function festivosSetParaAnio(year: number): Set<string> {
  let set = cacheFestivos.get(year)
  if (!set) {
    set = new Set(festivosColombia(year).map(claveFecha))
    cacheFestivos.set(year, set)
  }
  return set
}

/** true si la fecha es festivo en Colombia. */
export function esFestivoColombia(date: Date): boolean {
  return festivosSetParaAnio(date.getUTCFullYear()).has(claveFecha(date))
}

/** true si la fecha es sábado o domingo. */
export function esFinDeSemana(date: Date): boolean {
  const dow = date.getUTCDay()
  return dow === 0 || dow === 6
}

/** true si la fecha es día hábil judicial (ni fin de semana ni festivo). */
export function esDiaHabilColombia(date: Date): boolean {
  return !esFinDeSemana(date) && !esFestivoColombia(date)
}

/**
 * Suma N días hábiles a una fecha de inicio (la fecha de inicio NO cuenta
 * como uno de los días sumados, solo es el punto de partida — consistente
 * con el cómputo de términos procesales: el término empieza a correr al
 * día hábil siguiente de la notificación).
 */
export function sumarDiasHabilesColombia(fechaInicio: Date, diasHabiles: number): Date {
  let actual = new Date(fechaInicio)
  let restantes = diasHabiles
  while (restantes > 0) {
    actual = addDaysUTC(actual, 1)
    if (esDiaHabilColombia(actual)) restantes--
  }
  return actual
}

/** Parsea un string "YYYY-MM-DD" a Date UTC. Devuelve null si es inválido. */
export function parseFechaISO(s: string | null | undefined): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim())
  if (!m) return null
  const [, y, mo, d] = m
  const date = utcDate(Number(y), Number(mo), Number(d))
  if (Number.isNaN(date.getTime())) return null
  return date
}

/** Formatea una Date UTC a "YYYY-MM-DD". */
export function formatFechaISO(date: Date): string {
  return claveFecha(date)
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/**
 * Formatea de forma segura una fecha que viene de la base de datos a texto
 * legible en español ("20 nov. 2026" o "20 de noviembre"). Acepta lo que
 * devuelva el driver de Neon para una columna DATE — puede llegar como
 * "YYYY-MM-DD" puro, como ISO completo con hora ("YYYY-MM-DDT00:00:00.000Z")
 * o incluso como objeto Date — y nunca produce "Invalid Date": si no puede
 * parsear, devuelve null para que el llamador decida qué mostrar.
 */
export function formatFechaLegible(
  value: string | Date | null | undefined,
  estilo: 'corto' | 'largo' = 'corto'
): string | null {
  let date: Date | null = null
  if (value instanceof Date) {
    date = Number.isNaN(value.getTime()) ? null : value
  } else if (typeof value === 'string') {
    date = parseFechaISO(value)
  }
  if (!date) return null

  const dia = date.getUTCDate()
  const mes = date.getUTCMonth()
  const anio = date.getUTCFullYear()
  return estilo === 'largo' ? `${dia} de ${MESES_LARGOS[mes]} de ${anio}` : `${dia} ${MESES_CORTOS[mes]}. ${anio}`
}

/** Días hábiles restantes entre hoy (UTC, sin hora) y una fecha límite. Negativo si ya venció. */
export function diasHabilesRestantes(fechaLimite: Date): number {
  const hoy = utcDate(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, new Date().getUTCDate())
  if (formatFechaISO(fechaLimite) === formatFechaISO(hoy)) return 0
  const vencida = fechaLimite.getTime() < hoy.getTime()
  let cursor = new Date(hoy)
  let cuenta = 0
  if (vencida) {
    while (claveFecha(cursor) !== claveFecha(fechaLimite)) {
      cursor = addDaysUTC(cursor, -1)
      if (esDiaHabilColombia(cursor)) cuenta++
    }
    return -cuenta
  }
  while (claveFecha(cursor) !== claveFecha(fechaLimite)) {
    cursor = addDaysUTC(cursor, 1)
    if (esDiaHabilColombia(cursor)) cuenta++
  }
  return cuenta
}

/**
 * Días de calendario restantes entre hoy (UTC, sin hora) y una fecha límite.
 * Negativo si ya venció. A diferencia de diasHabilesRestantes, esta cuenta
 * todos los días (incluye fines de semana) — es la que se usa para mostrarle
 * al abogado "vence en N días", que es como la gente piensa los plazos en la
 * vida diaria, aunque el plazo legal en sí se haya calculado en días hábiles.
 */
export function diasCalendarioRestantes(fechaLimite: Date): number {
  const hoy = utcDate(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, new Date().getUTCDate())
  const msPorDia = 24 * 60 * 60 * 1000
  return Math.round((fechaLimite.getTime() - hoy.getTime()) / msPorDia)
}
