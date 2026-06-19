export interface SeccionContestacion {
  id: string
  titulo: string
  contenido: string
  requiereRevision: boolean
  motivoRevision: string | null
}

export interface MetadataDemanda {
  demandante: string
  demandado: string
  radicado?: string | null
  pretensiones: string
  cuantia: string
  juzgado: string
  tipoProceso: string
  terminoContestacion: string
  fechaNotificacion?: string | null
  terminoDias?: number | null
  normativaAplicable: string[]
  perfilCaso?: string
}

export type EstadoCaso = 'pendiente' | 'contestado' | 'archivado'

export interface Caso {
  id: number
  userId: number
  demandante: string | null
  demandado: string | null
  radicado: string | null
  juzgado: string | null
  tipoProceso: string | null
  fechaNotificacion: string | null
  terminoDias: number | null
  fechaVencimiento: string | null
  seguimientoActivo: boolean
  estado: EstadoCaso
  createdAt: string
}

export interface EstrategiaDefensiva {
  tipo: string
  justificacion: string
  excepcionesIdentificadas: string[]
}

export interface ContestacionData {
  metadata: MetadataDemanda
  estrategia: EstrategiaDefensiva
  sections: SeccionContestacion[]
  alertasCriticas?: string[]
  generadoEn: string
  casoId?: number | null
  fechaVencimientoSugerida?: string | null
}
