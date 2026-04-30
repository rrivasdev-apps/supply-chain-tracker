"use client"

import { useState, useEffect, useCallback } from "react"
import { useWeb3 } from "@/contexts/Web3Context"
import { getAllTokenIds, getToken, Token } from "@/services/Web3Service"

export function useAllTokens() {
  const { contract } = useWeb3()
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTokens = useCallback(async () => {
    if (!contract) return
    setLoading(true)
    setError(null)
    try {
      const ids: bigint[] = await getAllTokenIds(contract)
      const loaded = await Promise.all(ids.map((id) => getToken(contract, id)))
      // Orden cronológico garantizado por el índice on-chain
      setTokens(loaded)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar tokens")
    } finally {
      setLoading(false)
    }
  }, [contract])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  return { tokens, loading, error, refetch: fetchTokens }
}
