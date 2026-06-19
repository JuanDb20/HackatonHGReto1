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
  pretensiones: string
  cuantia: string
  juzgado: string
  tipoProceso: string
  terminoContestacion: string
  normativaAplicable: string[]
  perfilCaso?: string
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
}
