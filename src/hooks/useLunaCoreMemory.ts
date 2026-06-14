import { useCallback, useEffect, useState } from 'react'

export type LunaCoreMemoryFact = {
  id: string
  conteudo: string
  tipo: string
  escopo: string
  sessao_origem_id: string | null
  confirmado_em: string
  saliencia_score: number | null
}

export function useLunaCoreMemory(enabled: boolean) {
  const [fatos, setFatos] = useState<LunaCoreMemoryFact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled || !window.lunaCore?.listarMemoriaLonga) {
      setFatos([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await window.lunaCore.listarMemoriaLonga(80)
      if (!res.ok) {
        setError(res.error ?? 'Falha ao carregar memória Luna Core')
        setFatos([])
      } else {
        setFatos(res.fatos ?? [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar memória')
      setFatos([])
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void reload()
  }, [reload])

  return { fatos, loading, error, reload }
}
